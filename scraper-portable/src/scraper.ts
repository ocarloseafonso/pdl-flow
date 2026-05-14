/**
 * Site Scraper → Replica Prompt (versão portátil)
 *
 * Lógica pura, sem dependência de framework. Use em qualquer runtime Node/Bun
 * (Next.js Server Action, API route Express, Server Action do Antigravity, etc).
 *
 * Variáveis de ambiente necessárias:
 *   FIRECRAWL_API_KEY  — https://firecrawl.dev
 *   LOVABLE_API_KEY    — opcional. Se ausente, defina OPENAI_API_KEY/ANTHROPIC etc
 *                        e troque a chamada de LLM em `generateReplicaPrompt`.
 */

import Firecrawl from "@mendable/firecrawl-js";

export type CrawlPage = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
};

export type ScrapeResult = {
  startUrl: string;
  pages: CrawlPage[];
  branding: any | null;
  screenshot?: string | null;
  metadata: any;
};

export type GenerateFormat = "prompt" | "json";

function getClient() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY não configurada");
  return new Firecrawl({ apiKey });
}

export async function scrapeSite(input: {
  url: string;
  limit?: number;
  maxDepth?: number;
}): Promise<ScrapeResult> {
  if (!input?.url || !/^https?:\/\//.test(input.url)) {
    throw new Error("URL inválida (use https://...)");
  }
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);

  const fc = getClient();

  // 1) Homepage com branding + screenshot
  const home: any = await fc.scrape(input.url, {
    formats: ["markdown", "branding", "screenshot"],
    onlyMainContent: false,
  });

  const homeMarkdown = home?.markdown ?? home?.data?.markdown;
  const homeMeta = home?.metadata ?? home?.data?.metadata ?? {};
  const branding = home?.branding ?? home?.data?.branding ?? null;
  const screenshot = home?.screenshot ?? home?.data?.screenshot ?? null;

  const pages: CrawlPage[] = [
    {
      url: input.url,
      title: homeMeta?.title,
      description: homeMeta?.description,
      markdown: homeMarkdown,
    },
  ];

  // 2) Crawl interno
  try {
    const crawl: any = await fc.crawl(input.url, {
      limit,
      crawlEntireDomain: false,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      pollInterval: 2,
      timeout: 180,
    } as any);

    const docs: any[] = crawl?.data ?? crawl?.documents ?? [];
    for (const doc of docs) {
      const url = doc?.metadata?.sourceURL ?? doc?.metadata?.url;
      if (!url || pages.find((p) => p.url === url)) continue;
      pages.push({
        url,
        title: doc?.metadata?.title,
        description: doc?.metadata?.description,
        markdown: doc?.markdown,
      });
    }
  } catch (err) {
    console.error("crawl partial failure:", err);
  }

  return { startUrl: input.url, pages, branding, screenshot, metadata: homeMeta };
}

const PROMPT_SYSTEM = `Você é um arquiteto de produto especializado em transformar sites existentes em prompts ricos e estruturados para ferramentas no-code/low-code (Lovable, v0, Bolt). Seu objetivo é gerar uma especificação completa para que outro agente reconstrua uma réplica visual e funcional do site analisado, sem copiar conteúdo proprietário literalmente — use o conteúdo como referência de estrutura, copy e tom.`;

function buildUserPrompt(scrape: ScrapeResult, format: GenerateFormat) {
  const pageSummaries = scrape.pages
    .slice(0, 30)
    .map(
      (p, i) =>
        `### Página ${i + 1}: ${p.title ?? "(sem título)"}\nURL: ${p.url}\nDescrição: ${p.description ?? "-"}\n\nConteúdo (markdown):\n${(p.markdown ?? "").slice(0, 4000)}`,
    )
    .join("\n\n---\n\n");

  const brandingBlock = scrape.branding
    ? `\nBranding extraído:\n\`\`\`json\n${JSON.stringify(scrape.branding, null, 2)}\n\`\`\`\n`
    : "";

  const formatInstr =
    format === "json"
      ? `Retorne **apenas JSON válido** (sem markdown fences) com a estrutura:
{
  "overview": { "name": string, "tagline": string, "purpose": string, "audience": string, "tone": string },
  "designSystem": {
    "colors": { "primary": string, "secondary": string, "accent": string, "background": string, "foreground": string, "muted": string },
    "typography": { "headingFont": string, "bodyFont": string, "scale": object },
    "spacing": string, "borderRadius": string, "shadows": string,
    "components": object
  },
  "pages": [ { "route": string, "title": string, "sections": [ { "type": string, "purpose": string, "content": string, "components": [string] } ] } ],
  "navigation": { "header": [string], "footer": [string] },
  "interactions": [string],
  "assets": { "logo": string, "images": [string], "icons": [string] },
  "buildPrompt": string
}`
      : `Retorne um **prompt único em markdown** com estas seções (use ## para títulos):
1. Visão geral (nome, propósito, público, tom)
2. Design system (cores em hex, tipografia, espaçamento, raio, sombras)
3. Estrutura de páginas (rota, propósito, seções em ordem com componentes)
4. Navegação (header, footer, links)
5. Componentes-chave & interações (animações, hovers, microinterações)
6. Conteúdo & copy (textos por seção, tom de voz, exemplos)
7. Assets (logo, imagens, ícones)
8. Stack sugerida e instruções de implementação

Seja extremamente detalhado e específico — o leitor deve conseguir reconstruir o site sem ver o original.`;

  return `Analise o site ${scrape.startUrl} (${scrape.pages.length} páginas raspadas) e gere a especificação de réplica.

${brandingBlock}

# Páginas raspadas
${pageSummaries}

# Instrução de saída
${formatInstr}`;
}

/**
 * Gera o prompt/JSON usando o Lovable AI Gateway.
 * Para outro provedor (OpenAI/Anthropic), troque a URL/headers/body.
 */
export async function generateReplicaPrompt(input: {
  scrape: ScrapeResult;
  format: GenerateFormat;
}): Promise<{ content: string; format: GenerateFormat }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

  const userPrompt = buildUserPrompt(input.scrape, input.format);

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: PROMPT_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      ...(input.format === "json" ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway erro [${res.status}]: ${text}`);
  }
  const json: any = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  return { content, format: input.format };
}
