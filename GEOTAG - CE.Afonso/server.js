const { loadEnvSync, saveEnv } = require("./src/utils/env");
loadEnvSync();

const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const express = require("express");
const multer = require("multer");

const { ensureDir, safeBasename, uniqueFilename, readFileAsDataUrl } = require("./src/utils/files");
const clientsStore = require("./src/storage/clients");
const aiOpenAI = require("./src/ai/openai");
const aiGemini = require("./src/ai/gemini");
const runtimeAI = require("./src/ai/runtime");
const { processBatch } = require("./src/processing/processBatch");

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const RUNS_DIR = path.join(ROOT_DIR, "runs");
const UPLOAD_TMP_DIR = path.join(RUNS_DIR, "_upload_tmp");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(ROOT_DIR, "public")));

const upload = multer({
  dest: UPLOAD_TMP_DIR,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 2000,
  },
});

app.get("/api/health", async (_req, res) => {
  res.json({
    ok: true,
    ai: {
      provider: runtimeAI.getProvider(),
      openai: aiOpenAI.getRuntimeApiKeyStatus(),
      gemini: aiGemini.getRuntimeApiKeyStatus(),
      effective: runtimeAI.getEffectiveKeyStatus({ openai: aiOpenAI, gemini: aiGemini }),
    },
  });
});

app.get("/api/clients", async (_req, res) => {
  await ensureDir(DATA_DIR);
  const clients = await clientsStore.listClients(DATA_DIR);
  res.json({ clients });
});

app.post("/api/clients", async (req, res) => {
  await ensureDir(DATA_DIR);
  const created = await clientsStore.createClient(DATA_DIR, req.body || {});
  res.json({ client: created });
});

app.get("/api/clients/:id", async (req, res) => {
  await ensureDir(DATA_DIR);
  const client = await clientsStore.getClient(DATA_DIR, req.params.id);
  if (!client) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json({ client });
});

app.put("/api/clients/:id", async (req, res) => {
  await ensureDir(DATA_DIR);
  const updated = await clientsStore.updateClient(DATA_DIR, req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json({ client: updated });
});

app.delete("/api/clients/:id", async (req, res) => {
  await ensureDir(DATA_DIR);
  const ok = await clientsStore.deleteClient(DATA_DIR, req.params.id);
  if (!ok) return res.status(404).json({ error: "Cliente não encontrado." });
  res.json({ ok: true });
});

app.post("/api/settings/provider", async (req, res) => {
  const provider = typeof req.body?.provider === "string" ? req.body.provider : "";
  try {
    runtimeAI.setProvider(provider);
    await saveEnv({ AI_PROVIDER: provider });
    res.json({ ok: true, provider: runtimeAI.getProvider() });
  } catch (e) {
    res.status(400).json({ error: e?.message || "Provedor inválido." });
  }
});

app.post("/api/settings/openaiKey", async (req, res) => {
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey) return res.status(400).json({ error: "Chave inválida." });
  aiOpenAI.setRuntimeApiKey(apiKey);
  await saveEnv({ OPENAI_API_KEY: apiKey });
  res.json({ ok: true, openai: aiOpenAI.getRuntimeApiKeyStatus() });
});

app.post("/api/settings/geminiKey", async (req, res) => {
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey) return res.status(400).json({ error: "Chave inválida." });
  aiGemini.setRuntimeApiKey(apiKey);
  await saveEnv({ GEMINI_API_KEY: apiKey });
  res.json({ ok: true, gemini: aiGemini.getRuntimeApiKeyStatus() });
});

// Back-compat: este endpoint define a chave da OpenAI.
app.post("/api/settings/apiKey", async (req, res) => {
  const apiKey = typeof req.body?.apiKey === "string" ? req.body.apiKey.trim() : "";
  if (!apiKey) return res.status(400).json({ error: "Chave inválida." });
  aiOpenAI.setRuntimeApiKey(apiKey);
  await saveEnv({ OPENAI_API_KEY: apiKey });
  res.json({ ok: true, openai: aiOpenAI.getRuntimeApiKeyStatus() });
});

app.post("/api/ai/extractProfile", async (req, res) => {
  const briefingText = typeof req.body?.briefingText === "string" ? req.body.briefingText : "";
  if (!briefingText.trim()) return res.status(400).json({ error: "Briefing vazio." });

  try {
    const provider = runtimeAI.getProvider();
    const ai = provider === "gemini" ? aiGemini : aiOpenAI;
    const extracted = await ai.extractClientProfileWithAI({ briefingText });
    res.json({ extracted });
  } catch (err) {
    res.status(500).json({ error: err?.message || "Falha ao extrair briefing com IA." });
  }
});

app.post("/api/process", upload.array("photos", 2000), async (req, res) => {
  const jobId = crypto.randomUUID();
  const clientId = typeof req.body?.clientId === "string" ? req.body.clientId : "";
  const extraInstructions = typeof req.body?.extraInstructions === "string" ? req.body.extraInstructions : "";
  const options = (() => {
    try {
      return JSON.parse(req.body?.options || "{}");
    } catch {
      return {};
    }
  })();

  await ensureDir(DATA_DIR);
  await ensureDir(RUNS_DIR);
  await ensureDir(UPLOAD_TMP_DIR);

  const client = await clientsStore.getClient(DATA_DIR, clientId);
  if (!client) return res.status(400).json({ error: "Selecione um cliente válido." });

  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) return res.status(400).json({ error: "Selecione pelo menos 1 foto." });

  const runDir = path.join(RUNS_DIR, jobId);
  const inDir = path.join(runDir, "in");
  const outDir = path.join(runDir, "out");
  await ensureDir(inDir);
  await ensureDir(outDir);

  const movedFiles = [];
  for (const f of files) {
    const original = safeBasename(f.originalname || "foto.jpg");
    const target = path.join(inDir, await uniqueFilename(inDir, original));
    await fs.rename(f.path, target);
    movedFiles.push({ originalName: original, path: target });
  }

  try {
    const result = await processBatch({
      client,
      inFiles: movedFiles,
      outDir,
      jobId,
      extraInstructions,
      options,
      ai: {
        extractPhotoTags: async ({ clientProfile, filePath }) => {
          if (options?.ai?.analyzePhotos !== true) return null;
          const dataUrl = await readFileAsDataUrl(filePath);
          const provider = runtimeAI.getProvider();
          const ai = provider === "gemini" ? aiGemini : aiOpenAI;
          return await ai.tagPhotoWithAI({
            clientProfile,
            imageDataUrl: dataUrl,
            originalFilename: path.basename(filePath),
            extraInstructions,
          });
        },
      },
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=\"${result.zipFilename}\"`);
    return res.sendFile(result.zipPath);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Falha no processamento." });
  }
});

async function main() {
  await ensureDir(DATA_DIR);
  await ensureDir(RUNS_DIR);
  await ensureDir(UPLOAD_TMP_DIR);

  app.listen(PORT, () => {
    console.log(`GBP Foto Tagger rodando em http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
