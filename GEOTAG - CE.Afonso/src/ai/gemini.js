const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

let runtimeApiKey = "";

function setRuntimeApiKey(apiKey) {
  runtimeApiKey = String(apiKey || "").trim();
}

function getApiKey() {
  return runtimeApiKey || String(process.env.GEMINI_API_KEY || "").trim();
}

function getRuntimeApiKeyStatus() {
  const present = Boolean(getApiKey());
  return { present };
}

function parseDataUrl(dataUrl) {
  const s = String(dataUrl || "");
  const m = /^data:([^;]+);base64,(.+)$/i.exec(s);
  if (!m) throw new Error("Imagem inválida (data URL esperado).");
  return { mimeType: m[1], base64: m[2] };
}

async function callGeminiGenerateContent({ model, body }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("IA não configurada. Informe a chave do Gemini em Configurações.");

  const resp = await fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = json?.error?.message || `Falha na API do Gemini (HTTP ${resp.status}).`;
    throw new Error(msg);
  }
  return json;
}

function getTextFromResponse(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("").trim();
}

function clientProfileSchema() {
  return {
    type: "object",
    properties: {
      businessName: { type: "string" },
      address: { type: "string" },
      city: { type: "string" },
      state: { type: "string" },
      neighborhood: { type: "string" },
      primaryCategory: { type: "string" },
      services: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
      doNotUse: { type: "array", items: { type: "string" } },
      tone: { type: "string" },
      gps: {
        type: "object",
        properties: {
          enabled: { type: "boolean" },
          latitude: { type: "number" },
          longitude: { type: "number" },
        },
        required: ["enabled", "latitude", "longitude"],
      },
    },
    required: [
      "businessName",
      "address",
      "city",
      "state",
      "neighborhood",
      "primaryCategory",
      "services",
      "keywords",
      "doNotUse",
      "tone",
      "gps",
    ],
  };
}

async function extractClientProfileWithAI({ briefingText }) {
  const schema = clientProfileSchema();

  const body = {
    systemInstruction: {
      parts: [
        {
          text:
            "Extraia do briefing um perfil de cliente para gerar tags e descrições de fotos. " +
            "Se algum campo não estiver no briefing, devolva string vazia ou lista vazia; GPS: enabled=false e lat/lon=0.",
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: "BRIEFING:\n" + String(briefingText || "") }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  const json = await callGeminiGenerateContent({ model: DEFAULT_MODEL, body });
  const text = getTextFromResponse(json);
  if (!text) throw new Error("A IA não retornou dados.");
  return JSON.parse(text);
}

function photoTagSchema() {
  return {
    type: "object",
    properties: {
      photoType: { type: "string" },
      title: { type: "string" },
      caption: { type: "string" },
      keywords: { type: "array", items: { type: "string" } },
      suggestedFilename: { type: "string" },
      creator: { type: "string" },
      copyright: { type: "string" },
      altText: { type: "string" },
      gmbCaption: { type: "string" },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: [
      "photoType",
      "title",
      "caption",
      "keywords",
      "suggestedFilename",
      "creator",
      "copyright",
      "altText",
      "gmbCaption",
      "warnings"
    ],
  };
}

async function tagPhotoWithAI({ clientProfile, imageDataUrl, originalFilename, extraInstructions }) {
  const schema = photoTagSchema();
  const { mimeType, base64 } = parseDataUrl(imageDataUrl);
  const currentYear = new Date().getFullYear();

  const promptText =
    "PERFIL DO CLIENTE (JSON):\n" +
    JSON.stringify(clientProfile || {}) +
    "\n\nNOME ORIGINAL DO ARQUIVO: " +
    String(originalFilename || "") +
    "\n\nANO ATUAL PARA COPYRIGHT: " +
    currentYear +
    (extraInstructions?.trim() ? "\n\nINSTRUÇÕES EXTRAS:\n" + extraInstructions.trim() : "") +
    "\n\nAnalise a imagem e gere as tags, legenda e metadados no schema especificado seguindo as regras de SEO Local.";

  const body = {
    systemInstruction: {
      parts: [
        {
          text:
            "Você é um especialista em SEO Local e metadados IPTC/XMP (padrão IPTC Photo Metadata Standard 2021) para fotos do Google Business Profile.\n" +
            "Sua tarefa é gerar metadados otimizados para a imagem enviada, baseando-se no perfil do cliente fornecido.\n\n" +
            "Regras obrigatórias para os campos do JSON:\n" +
            "1. 'title': Título otimizado com a palavra-chave principal. Máximo de 64 caracteres.\n" +
            "2. 'caption': Descrição semântica natural de 2-3 frases que inclua o serviço retratado, o público e a localização do negócio de forma fluida. Sem exageros ou spam. Máximo de 200 caracteres.\n" +
            "3. 'keywords': Array com até 30 keywords/tags semânticas e de SEO Local (ex: serviço, público, bairro, especialidade). Sem keyword stuffing.\n" +
            "4. 'suggestedFilename': Nome de arquivo amigável para SEO no formato '[servico]-[local]-[marca].[extensão]', convertido para minúsculo, sem acentos, com hífens no lugar de espaços e pontuações. Máximo de 120 caracteres. Use a extensão correta da imagem original (como .jpg ou .png).\n" +
            "5. 'creator': Formato '[Profissional/Dono] - [Nome da Empresa]'. Se o profissional não estiver especificado no perfil do cliente, use apenas '[Nome da Empresa]'.\n" +
            "6. 'copyright': Formato '© [ANO ATUAL] [Nome da Empresa]. Todos os direitos reservados.' (use o ano atual fornecido).\n" +
            "7. 'altText': Texto alternativo curto e descritivo para acessibilidade e SEO da imagem, focado na palavra-chave e no que a imagem exibe (máx 125 caracteres).\n" +
            "8. 'gmbCaption': Legenda sugerida pronta para a postagem no Google Meu Negócio / GMB (descrição do post contendo chamada para ação leve).\n" +
            "9. 'photoType': Uma categoria dentre: 'interior', 'exterior', 'service', 'team', 'product', 'other'.\n" +
            "10. 'warnings': Array de strings contendo alertas caso a imagem tenha problemas (baixa qualidade, texto excessivo, etc.).\n\n" +
            "Retorne APENAS o objeto JSON correspondente ao schema especificado."
        },
      ],
    },
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: promptText },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  const json = await callGeminiGenerateContent({ model: DEFAULT_MODEL, body });
  const text = getTextFromResponse(json);
  if (!text) throw new Error("A IA não retornou tags da foto.");
  return JSON.parse(text);
}

module.exports = {
  setRuntimeApiKey,
  getRuntimeApiKeyStatus,
  extractClientProfileWithAI,
  tagPhotoWithAI,
};

