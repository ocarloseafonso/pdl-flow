# Site Scraper → Replica Prompt (versão portátil)

Pacote independente de framework para **raspar qualquer site público** (homepage + páginas internas) usando Firecrawl, e gerar um **prompt de réplica** (markdown ou JSON estruturado) pronto para colar em ferramentas como Lovable, v0, Bolt, Cursor, Antigravity, etc.

> Esta é a versão portátil do projeto Lovable original. A lógica é JS puro — sem dependência de TanStack Start. Use em Next.js, Express, Fastify, Bun, Hono, Server Actions, Antigravity, etc.

---

## 📦 O que tem aqui

```
.
├── src/scraper.ts        # Lógica principal (scrapeSite + generateReplicaPrompt)
├── examples/cli.ts       # Exemplo de uso por linha de comando
├── package.json
└── README.md             # este arquivo
```

Apenas **uma dependência runtime**: `@mendable/firecrawl-js`.

---

## 🔑 Variáveis de ambiente

| Variável             | Obrigatória | Onde obter |
|----------------------|-------------|-----------|
| `FIRECRAWL_API_KEY`  | ✅          | https://firecrawl.dev (free tier disponível) |
| `LOVABLE_API_KEY`    | ✅ (default) | Vem do Lovable Cloud. Veja "Trocar de provedor LLM" abaixo se quiser usar OpenAI/Anthropic. |

Crie um `.env`:
```
FIRECRAWL_API_KEY=fc-...
LOVABLE_API_KEY=...
```

---

## 🚀 Uso rápido

### 1. Instalar
```bash
npm install            # ou: bun install / pnpm install
```

### 2. Rodar o CLI de exemplo
```bash
npx tsx examples/cli.ts https://exemplo.com prompt
# gera replica.md

npx tsx examples/cli.ts https://exemplo.com json
# gera replica.json
```

### 3. Usar como biblioteca
```ts
import { scrapeSite, generateReplicaPrompt } from "./src/scraper";

const scrape = await scrapeSite({
  url: "https://stripe.com",
  limit: 25,        // máx páginas (1–100)
  maxDepth: 3,      // 1–5
});

const { content } = await generateReplicaPrompt({
  scrape,
  format: "prompt", // ou "json"
});

console.log(content);
```

---

## 🧠 Como funciona

1. **`scrapeSite(url)`**
   - Chama `firecrawl.scrape(url, { formats: ["markdown", "branding", "screenshot"] })` para extrair markdown + cores/fontes/logo + screenshot da homepage.
   - Chama `firecrawl.crawl(url, { limit })` para raspar até N páginas internas em markdown.
   - Retorna `ScrapeResult` consolidado.

2. **`generateReplicaPrompt({ scrape, format })`**
   - Monta um prompt de sistema + user prompt com **branding** + **resumo das páginas** (até 30 páginas, 4000 chars cada).
   - Envia ao **Lovable AI Gateway** (`google/gemini-2.5-flash`).
   - `format: "prompt"` → markdown com 8 seções (visão, design system, páginas, navegação, interações, copy, assets, stack).
   - `format: "json"` → JSON estruturado pronto para consumir programaticamente.

---

## 🔌 Integrar em outros frameworks

A lógica é assíncrona e sem efeitos colaterais — adapte o **wrapper** ao seu framework.

### Next.js — Route Handler
```ts
// app/api/scrape/route.ts
import { scrapeSite, generateReplicaPrompt } from "@/lib/scraper";

export async function POST(req: Request) {
  const { url, format = "prompt" } = await req.json();
  const scrape = await scrapeSite({ url });
  const out = await generateReplicaPrompt({ scrape, format });
  return Response.json(out);
}
```

### Next.js — Server Action
```ts
"use server";
import { scrapeSite, generateReplicaPrompt } from "@/lib/scraper";

export async function generateReplica(url: string) {
  const scrape = await scrapeSite({ url });
  return generateReplicaPrompt({ scrape, format: "prompt" });
}
```

### Express
```ts
import express from "express";
import { scrapeSite, generateReplicaPrompt } from "./scraper";

const app = express();
app.use(express.json());

app.post("/api/scrape", async (req, res) => {
  try {
    const scrape = await scrapeSite({ url: req.body.url });
    const out = await generateReplicaPrompt({ scrape, format: req.body.format ?? "prompt" });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
```

### Hono / Bun / Cloudflare Workers
Funciona igual — mas atenção: o Firecrawl SDK usa `fetch`, então roda em edge. Apenas garanta que o runtime suporta `node:` builtins se você usar streams.

---

## 🔄 Trocar de provedor LLM

Em `src/scraper.ts`, dentro de `generateReplicaPrompt`, substitua a chamada `fetch` ao Lovable Gateway. O contrato é OpenAI-compatible — qualquer um destes funciona quase trocando URL/headers:

### OpenAI
```ts
const res = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PROMPT_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    ...(input.format === "json" ? { response_format: { type: "json_object" } } : {}),
  }),
});
```

### Anthropic
```ts
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    system: PROMPT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  }),
});
const json = await res.json();
const content = json?.content?.[0]?.text ?? "";
```

### Google Gemini direto
```ts
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT_SYSTEM}\n\n${userPrompt}` }] }],
    }),
  },
);
```

---

## 🧰 Dicas para o agente de IA do Antigravity

Quando integrar este pacote, o agente deve:

1. **Instalar a dep:** `npm install @mendable/firecrawl-js`.
2. **Pedir as duas chaves** (`FIRECRAWL_API_KEY` + chave do LLM escolhido) e armazenar como variáveis de ambiente.
3. **Copiar `src/scraper.ts`** para o caminho equivalente no projeto-alvo (ex: `lib/scraper.ts` ou `server/scraper.ts`).
4. **Adaptar somente o invólucro** (Server Action, route handler, etc) — nunca alterar `scrapeSite` / `generateReplicaPrompt` salvo para trocar de LLM.
5. **Se o site-alvo for grande**, ajustar `limit` (até 100). Cada página consome créditos no Firecrawl.
6. **Para uso 100% client-side é IMPOSSÍVEL** — precisa rodar no servidor para não vazar as chaves.
7. **Streaming opcional**: o gateway suporta `stream: true` (SSE). Se quiser UX em tempo real, ler `text/event-stream`.

---

## ⚠️ Limites & boas práticas

- **Firecrawl free tier** tem cota mensal — monitore com `firecrawl.getCreditUsage()` se for produção.
- **Sites com login/paywall** não funcionam (este pacote não autentica).
- **JS-heavy sites** (SPA) já são suportados pelo Firecrawl (browser renderer).
- **Conteúdo proprietário**: o prompt instrui o LLM a usar o conteúdo como **referência estrutural**, não para cópia literal. Mesmo assim, **não publique réplicas de sites de terceiros sem permissão**.
- **Robots.txt**: Firecrawl respeita `robots.txt` por padrão.

---

## 📄 Licença

Use livremente. Sem garantias.
