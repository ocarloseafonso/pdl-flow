const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const CLIENTS_FILENAME = "clients.json";

async function readJson(filePath, fallback) {
  try {
    const txt = await fs.readFile(filePath, "utf8");
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, value) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `${path.basename(filePath)}.${crypto.randomUUID()}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

function normalizeClientInput(input) {
  const now = new Date().toISOString();
  const name = typeof input?.name === "string" ? input.name.trim() : "";
  const briefingText = typeof input?.briefingText === "string" ? input.briefingText : "";

  const profile = typeof input?.profile === "object" && input.profile ? input.profile : {};
  const settings = typeof input?.settings === "object" && input.settings ? input.settings : {};

  return {
    name,
    briefingText,
    profile,
    settings,
    updatedAt: now,
  };
}

async function loadClients(dataDir) {
  const filePath = path.join(dataDir, CLIENTS_FILENAME);
  const data = await readJson(filePath, { clients: [] });
  if (!data || !Array.isArray(data.clients)) return { clients: [] };
  return data;
}

async function saveClients(dataDir, data) {
  const filePath = path.join(dataDir, CLIENTS_FILENAME);
  await writeJsonAtomic(filePath, data);
}

async function listClients(dataDir) {
  const data = await loadClients(dataDir);
  return data.clients.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
}

async function getClient(dataDir, id) {
  const data = await loadClients(dataDir);
  return data.clients.find((c) => c.id === id) || null;
}

async function createClient(dataDir, input) {
  const data = await loadClients(dataDir);
  const now = new Date().toISOString();
  const normalized = normalizeClientInput(input);
  if (!normalized.name) throw new Error("Informe o nome do cliente.");

  const client = {
    id: crypto.randomUUID(),
    createdAt: now,
    ...normalized,
  };
  data.clients.push(client);
  await saveClients(dataDir, data);
  return client;
}

async function updateClient(dataDir, id, input) {
  const data = await loadClients(dataDir);
  const idx = data.clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const normalized = normalizeClientInput(input);
  if (!normalized.name) throw new Error("Informe o nome do cliente.");

  data.clients[idx] = {
    ...data.clients[idx],
    ...normalized,
  };
  await saveClients(dataDir, data);
  return data.clients[idx];
}

async function deleteClient(dataDir, id) {
  const data = await loadClients(dataDir);
  const before = data.clients.length;
  data.clients = data.clients.filter((c) => c.id !== id);
  if (data.clients.length === before) return false;
  await saveClients(dataDir, data);
  return true;
}

module.exports = {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
};
