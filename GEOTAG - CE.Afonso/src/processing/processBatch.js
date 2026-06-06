const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const { ZipArchive } = require("archiver");
const { exiftool } = require("exiftool-vendored");
const pLimitModule = require("p-limit");
const pLimit = pLimitModule.default || pLimitModule;
const sanitize = require("sanitize-filename");

const { ensureDir, slugifyForFilename, uniqueFilename } = require("../utils/files");

function toCsvValue(value) {
  const s = value == null ? "" : String(value);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

async function writeCsv(filePath, rows) {
  if (!rows.length) {
    await fs.writeFile(filePath, "", "utf8");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(toCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue(row[h])).join(","));
  }
  await fs.writeFile(filePath, lines.join("\n"), "utf8");
}

function normalizeKeywords(keywords, doNotUse) {
  const deny = new Set((doNotUse || []).map((s) => String(s || "").trim().toLowerCase()).filter(Boolean));
  const out = [];
  for (const k of Array.isArray(keywords) ? keywords : []) {
    const cleaned = String(k || "").trim();
    if (!cleaned) continue;
    if (deny.has(cleaned.toLowerCase())) continue;
    if (!out.some((x) => x.toLowerCase() === cleaned.toLowerCase())) out.push(cleaned);
  }
  return out.slice(0, 30); // Up to 30 keywords as per local SEO standard
}

function formatSuggestedFilename(suggestedFilename, originalName, clientName) {
  const ext = (path.extname(suggestedFilename) || path.extname(originalName) || ".jpg").toLowerCase();
  const stemRaw = path.parse(suggestedFilename || originalName || clientName || "foto").name;
  
  // Normalize: remove accents, replace spaces/symbols with hyphens, lowercase
  let stem = stemRaw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();
    
  if (!stem) stem = "foto";
  stem = stem.slice(0, 120); // Truncate at 120 characters
  return `${stem}${ext}`;
}

function defaultPhotoTagsFromClient(client, originalName) {
  const business = client?.profile?.businessName || client?.name || "";
  const city = client?.profile?.city || "";
  const ext = (path.extname(originalName) || ".jpg").toLowerCase();
  const base = [business, city].filter(Boolean).join(" - ") || "foto";
  const stem = slugifyForFilename(base) || "foto";
  const currentYear = new Date().getFullYear();
  return {
    photoType: "other",
    title: base.slice(0, 64),
    caption: (business ? `Foto de ${business}.` : "Foto.").slice(0, 200),
    keywords: normalizeKeywords(client?.profile?.keywords || client?.settings?.keywords || [], client?.profile?.doNotUse || client?.settings?.doNotUse || []),
    suggestedFilename: `${stem}-${slugifyForFilename(path.parse(originalName).name) || "imagem"}${ext}`,
    creator: business,
    copyright: `© ${currentYear} ${business}. Todos os direitos reservados.`,
    altText: business ? `Foto de ${business}` : "Foto do negócio local",
    gmbCaption: business ? `Conheça nossos serviços na ${business}!` : "Foto do negócio local",
    warnings: [],
  };
}

async function zipDirectoryToFile(srcDir, zipPath) {
  await ensureDir(path.dirname(zipPath));
  const handle = await fs.open(zipPath, "w");
  const stream = handle.createWriteStream();

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const done = new Promise((resolve, reject) => {
    stream.on("close", resolve);
    stream.on("error", reject);
    archive.on("error", reject);
  });

  archive.pipe(stream);
  archive.directory(srcDir, false);
  await archive.finalize();
  await done;
  await handle.close();
}

async function processBatch({ client, inFiles, outDir, jobId, extraInstructions, options, ai }) {
  const safeClientName = sanitize(client?.name || "cliente") || "cliente";
  const writeMetadata = options?.writeMetadata !== false;
  const renameFiles = options?.renameFiles !== false;
  const embedGps = options?.gps?.enabled === true;
  const concurrency = Math.max(1, Math.min(8, Number(options?.concurrency || 2)));

  const clientProfile = client?.profile || {};
  const doNotUse = clientProfile?.doNotUse || [];

  const reportRows = [];
  const processed = [];

  const limit = pLimit(concurrency);
  const tasks = inFiles.map((f) =>
    limit(async () => {
      const originalName = f.originalName;
      const inputExt = (path.extname(originalName) || path.extname(f.path) || ".jpg").toLowerCase();

      const aiTags = await ai?.extractPhotoTags?.({ clientProfile, filePath: f.path }).catch((e) => ({
        _aiError: e?.message || "Falha IA",
      }));

      const tags = aiTags && !aiTags._aiError ? aiTags : defaultPhotoTagsFromClient(client, originalName);
      if (aiTags && aiTags._aiError) {
        tags.warnings = Array.isArray(tags.warnings) ? tags.warnings : [];
        tags.warnings.push(`IA: ${aiTags._aiError}`);
      }

      const keywords = normalizeKeywords(tags.keywords, doNotUse);

      const desiredNameRaw = renameFiles ? tags.suggestedFilename || originalName : originalName;
      const desiredName = formatSuggestedFilename(desiredNameRaw, originalName, client.name);
      const finalName = await uniqueFilename(outDir, desiredName);

      const outPath = path.join(outDir, finalName);
      await fs.copyFile(f.path, outPath);

      let formattedDate = "";
      let isoDateTime = "";

      if (writeMetadata) {
        // Step 1: Strip all existing metadata (EXIF camera, GPS, system, etc.)
        try {
          await exiftool.write(outPath, {}, ["-all=", "-overwrite_original"]);
        } catch (e) {
          tags.warnings = Array.isArray(tags.warnings) ? tags.warnings : [];
          tags.warnings.push("Erro ao limpar metadados antigos: " + e.message);
        }

        // Step 2: Prepare new tags following IPTC Core / XMP standard
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        formattedDate = `${year}:${month}:${day}`;

        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        isoDateTime = `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;

        const writeTags = {
          "IPTC:ObjectName": (tags.title || "").slice(0, 64),
          "XMP:Title": (tags.title || "").slice(0, 64),
          "IPTC:Caption-Abstract": (tags.caption || "").slice(0, 200),
          "XMP:Description": (tags.caption || "").slice(0, 200),
          "IPTC:Keywords": keywords,
          "XMP:Subject": keywords,
          "IPTC:By-line": tags.creator || "",
          "XMP:Creator": tags.creator || "",
          "IPTC:CopyrightNotice": tags.copyright || "",
          "XMP:Rights": tags.copyright || "",
          "IPTC:DateCreated": formattedDate,
          "XMP:CreateDate": isoDateTime,
        };

        if (embedGps && clientProfile?.gps?.enabled === true) {
          writeTags.GPSLatitude = Number(clientProfile.gps.latitude) || 0;
          writeTags.GPSLongitude = Number(clientProfile.gps.longitude) || 0;
          writeTags.GPSLatitudeRef = Number(clientProfile.gps.latitude) >= 0 ? "N" : "S";
          writeTags.GPSLongitudeRef = Number(clientProfile.gps.longitude) >= 0 ? "E" : "W";
        }

        // Step 3: Write new tags
        try {
          await exiftool.write(outPath, writeTags, ["-overwrite_original"]);
        } catch (e) {
          tags.warnings = Array.isArray(tags.warnings) ? tags.warnings : [];
          tags.warnings.push("Erro ao gravar metadados SEO: " + e.message);
        }
      }

      // Step 4: Validate resolution and file weight
      let width = null;
      let height = null;
      let fileBytes = 0;
      try {
        const stats = await fs.stat(outPath);
        fileBytes = stats.size;

        const info = await exiftool.read(outPath);
        width = info.ImageWidth;
        height = info.ImageHeight;
      } catch (e) {
        tags.warnings = Array.isArray(tags.warnings) ? tags.warnings : [];
        tags.warnings.push("Erro ao validar tamanho/resolução: " + e.message);
      }

      tags.warnings = Array.isArray(tags.warnings) ? tags.warnings : [];

      const isPng = inputExt === ".png";
      const isJpg = inputExt === ".jpg" || inputExt === ".jpeg";
      if (isPng && fileBytes > 500 * 1024) {
        tags.warnings.push(`Tamanho recomendado para PNG excedido: ${(fileBytes / 1024).toFixed(0)}KB (máx 500KB)`);
      } else if (isJpg && fileBytes > 1024 * 1024) {
        tags.warnings.push(`Tamanho recomendado para JPG excedido: ${(fileBytes / 1024 / 1024).toFixed(2)}MB (máx 1MB)`);
      }

      if (width && height) {
        if (width < 720 || width > 1200 || height < 720 || height > 1200) {
          tags.warnings.push(`Resolução fora do recomendado: ${width}x${height}px (recomendado: 720x720px a 1200x1200px)`);
        }
      } else {
        tags.warnings.push("Não foi possível ler as dimensões da imagem.");
      }

      // Step 5: Compute MD5 Hash
      let md5Hash = "";
      try {
        const fileBuf = await fs.readFile(outPath);
        md5Hash = crypto.createHash("md5").update(fileBuf).digest("hex");
      } catch (e) {
        tags.warnings.push("Erro ao calcular MD5: " + e.message);
      }

      // Step 6: Create individual _audit.json file
      const auditFilename = `${path.parse(finalName).name}_audit.json`;
      const auditPath = path.join(outDir, auditFilename);
      const auditData = {
        jobId,
        clientId: client.id,
        clientName: client.name,
        originalFile: originalName,
        outputFile: finalName,
        md5: md5Hash,
        status: tags.warnings.length === 0 ? "sucesso" : "alerta",
        validation: {
          isValid: tags.warnings.length === 0,
          warnings: tags.warnings,
          imageWidth: width,
          imageHeight: height,
          fileSizeBytes: fileBytes
        },
        metadataApplied: {
          title: tags.title || "",
          caption: tags.caption || "",
          keywords,
          creator: tags.creator || "",
          copyright: tags.copyright || "",
          dateCreated: writeMetadata ? formattedDate : null,
          gps: embedGps && clientProfile?.gps?.enabled === true ? {
            latitude: clientProfile.gps.latitude,
            longitude: clientProfile.gps.longitude
          } : null
        },
        suggestions: {
          altText: tags.altText || "",
          gmbCaption: tags.gmbCaption || ""
        }
      };

      try {
        await fs.writeFile(auditPath, JSON.stringify(auditData, null, 2), "utf8");
      } catch (e) {
        console.error("Erro ao escrever audit:", e);
      }

      reportRows.push({
        jobId,
        clientId: client.id,
        clientName: client.name,
        originalFile: originalName,
        outputFile: finalName,
        photoType: tags.photoType || "",
        title: tags.title || "",
        caption: tags.caption || "",
        keywords: keywords.join("; "),
        creator: tags.creator || "",
        copyright: tags.copyright || "",
        altText: tags.altText || "",
        gmbCaption: tags.gmbCaption || "",
        md5: md5Hash,
        warnings: (tags.warnings || []).join(" | "),
        aiInstructions: (extraInstructions || "").slice(0, 2000),
      });

      processed.push({ originalName, finalName, tags: { ...tags, keywords } });
    }),
  );

  await Promise.all(tasks);

  const counts = processed.reduce((acc, it) => {
    const t = String(it?.tags?.photoType || "other");
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const planLines = [
    `# Plano de upload`,
    ``,
    `Cliente: ${client.name}`,
    `Execução: ${jobId}`,
    ``,
    `## Resumo`,
    ``,
    `Total de fotos: ${processed.length}`,
    ``,
    `## Tipos (IA)`,
    ``,
    ...Object.keys(counts)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((k) => `- ${k}: ${counts[k]}`),
    ``,
    `## Lembretes`,
    ``,
    `- Suba fotos reais e bem iluminadas (sem alterações exageradas).`,
    `- Varie: exterior, interior, equipe, serviço em ação, produtos.`,
    `- Evite duplicadas e fotos que não representem o que o cliente encontra no local.`,
    ``,
  ];
  await fs.writeFile(path.join(outDir, "plano_upload.md"), planLines.join("\n"), "utf8");

  const reportJsonPath = path.join(outDir, "relatorio.json");
  const reportCsvPath = path.join(outDir, "relatorio.csv");
  await fs.writeFile(
    reportJsonPath,
    JSON.stringify({ jobId, client: { id: client.id, name: client.name }, processed }, null, 2),
    "utf8",
  );
  await writeCsv(reportCsvPath, reportRows);

  const zipFilename = `${safeClientName}-${jobId}.zip`;
  const zipPath = path.join(path.dirname(outDir), zipFilename);
  await zipDirectoryToFile(outDir, zipPath);

  return { zipPath, zipFilename };
}

module.exports = { processBatch };
