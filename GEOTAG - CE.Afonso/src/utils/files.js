const path = require("node:path");
const fs = require("node:fs/promises");

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function safeBasename(name) {
  const base = path.basename(String(name || ""));
  return base.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").trim() || "arquivo";
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function splitExt(filename) {
  const ext = path.extname(filename);
  const stem = ext ? filename.slice(0, -ext.length) : filename;
  return { stem, ext };
}

async function uniqueFilename(dir, originalFilename) {
  const safe = safeBasename(originalFilename);
  const { stem, ext } = splitExt(safe);
  let candidate = safe;
  let i = 2;
  while (await pathExists(path.join(dir, candidate))) {
    candidate = `${stem}_${i}${ext}`;
    i += 1;
  }
  return candidate;
}

function slugifyForFilename(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase()
    .slice(0, 80);
}

async function readFileAsDataUrl(filePath) {
  const buf = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

module.exports = {
  ensureDir,
  safeBasename,
  uniqueFilename,
  slugifyForFilename,
  readFileAsDataUrl,
};
