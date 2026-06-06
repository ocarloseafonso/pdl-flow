const path = require("node:path");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");

const dotenvPath = path.join(__dirname, "..", "..", ".env");

function loadEnvSync() {
  try {
    if (fsSync.existsSync(dotenvPath)) {
      const data = fsSync.readFileSync(dotenvPath, "utf8");
      for (const line of data.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim();
          const value = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, "");
          process.env[key] = value;
        }
      }
    }
  } catch (err) {
    console.error("Erro ao carregar o arquivo .env:", err);
  }
}

async function saveEnv(updates) {
  let envContent = "";
  try {
    envContent = await fs.readFile(dotenvPath, "utf8");
  } catch {
    // Se o arquivo não existir, inicia vazio
  }

  const lines = envContent.split(/\r?\n/);
  const newLines = [];
  const updatedKeys = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      newLines.push(line);
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      if (updates.hasOwnProperty(key)) {
        newLines.push(`${key}=${updates[key]}`);
        updatedKeys.add(key);
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  for (const [key, val] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${val}`);
    }
  }

  await fs.writeFile(dotenvPath, newLines.join("\n"), "utf8");

  for (const [key, val] of Object.entries(updates)) {
    process.env[key] = val;
  }
}

module.exports = {
  loadEnvSync,
  saveEnv,
};
