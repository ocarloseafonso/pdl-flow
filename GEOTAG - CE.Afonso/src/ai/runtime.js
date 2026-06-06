let provider = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
if (provider !== "openai" && provider !== "gemini") provider = "gemini";

function setProvider(next) {
  const p = String(next || "").trim().toLowerCase();
  if (p !== "openai" && p !== "gemini") throw new Error("Provedor inválido. Use: openai ou gemini.");
  provider = p;
}

function getProvider() {
  return provider;
}

function getEffectiveKeyStatus({ openai, gemini }) {
  const p = getProvider();
  const mod = p === "gemini" ? gemini : openai;
  return { provider: p, present: Boolean(mod?.getRuntimeApiKeyStatus?.()?.present) };
}

module.exports = {
  setProvider,
  getProvider,
  getEffectiveKeyStatus,
};
