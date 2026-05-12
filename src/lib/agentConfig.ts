import { Client } from "./types";
import { GMN_KNOWLEDGE } from "./gmnKnowledge";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
export type AgentStatus = "locked" | "active" | "done";
export type Role = "user" | "assistant";
export interface Message { role: Role; content: string; }
export interface AgentState { status: AgentStatus; output: string; messages: Message[]; }
export type AllAgentState = Record<number, AgentState>;

/* ═══════════════════════════════════════════════════
   PIPELINE DEFINITION
   Regular: 1-6   Senior: 101-106   Final: 7
═══════════════════════════════════════════════════ */
export const PIPELINE = [1, 101, 2, 102, 3, 103, 4, 104, 5, 105, 6, 106, 7];

export const AGENTS: { id: number; emoji: string; label: string; isSenior: boolean }[] = [
  { id: 1,   emoji: "🧭", label: "Estrategista SEO Local",         isSenior: false },
  { id: 101, emoji: "🎓", label: "Revisor Sênior — Estratégia",    isSenior: true  },
  { id: 2,   emoji: "🔍", label: "Analista de Palavras-chave",     isSenior: false },
  { id: 102, emoji: "🎓", label: "Revisor Sênior — Keywords",      isSenior: true  },
  { id: 3,   emoji: "📍", label: "Especialista GMB",               isSenior: false },
  { id: 103, emoji: "🎓", label: "Revisor Sênior — GMB",           isSenior: true  },
  { id: 4,   emoji: "🏗️", label: "Arquiteto de Site SEO",          isSenior: false },
  { id: 104, emoji: "🎓", label: "Revisor Sênior — Estrutura",     isSenior: true  },
  { id: 5,   emoji: "✍️", label: "Copywriter",                     isSenior: false },
  { id: 105, emoji: "🎓", label: "Revisor Sênior — Copy",          isSenior: true  },
  { id: 6,   emoji: "📝", label: "Redator SEO Blog",               isSenior: false },
  { id: 106, emoji: "🎓", label: "Revisor Sênior — Blog",          isSenior: true  },
  { id: 7,   emoji: "🚀", label: "Gerador de Prompt Final",        isSenior: false },
];

/* ═══════════════════════════════════════════════════
   PERSISTENCE — localStorage per client
═══════════════════════════════════════════════════ */
const storageKey = (clientId: string) => `pdl_agents_v2_${clientId}`;

export function loadSession(clientId: string): AllAgentState | null {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    if (raw) return JSON.parse(raw) as AllAgentState;
  } catch { /* ignore */ }
  return null;
}

export function saveSession(clientId: string, state: AllAgentState) {
  try {
    localStorage.setItem(storageKey(clientId), JSON.stringify(state));
  } catch { /* ignore */ }
}

export function clearSession(clientId: string) {
  localStorage.removeItem(storageKey(clientId));
}

export function makeInitialState(): AllAgentState {
  const rec: AllAgentState = {};
  PIPELINE.forEach((id, idx) => {
    rec[id] = { status: idx === 0 ? "active" : "locked", output: "", messages: [] };
  });
  return rec;
}

/* ═══════════════════════════════════════════════════
   CLIENT CONTEXT BUILDER
═══════════════════════════════════════════════════ */
export function buildClientContext(client: Client): string {
  const b = (client.briefing_data ?? {}) as Record<string, unknown>;
  const f = (key: string, ...aliases: string[]) =>
    String(b[key] ?? aliases.reduce((v, k) => v ?? b[k], undefined as unknown) ?? "não informado");

  const lines = [
    `=== BRIEFING COMPLETO DO CLIENTE ===`,
    `Nome: ${client.name}`,
    `Empresa: ${client.company_name ?? f("company_name")}`,
    `Segmento/Nicho: ${client.segment ?? f("segment")}`,
    `Cidade/Estado: ${f("city_state")}`,
    `Telefone: ${f("phone")}`,
    `WhatsApp: ${f("whatsapp", "whatsapp_response_time")}`,
    `E-mail: ${f("email")}`,
    `Site atual: ${client.site_url ?? f("website")}`,
    `Instagram: ${f("instagram", "socials", "other_socials")}`,
    `Serviço principal: ${f("main_service")}`,
    `Outros serviços: ${f("other_services")}`,
    `Problema que resolve: ${f("problem_solved")}`,
    `Público-alvo: ${f("audience")}`,
    `Como adquire clientes hoje: ${f("acquisition")}`,
    `Diferenciais: ${f("differentiator")}`,
    `Elogios recorrentes: ${f("praises")}`,
    `Concorrentes: ${f("competitors")}`,
    `Horário de funcionamento: ${f("hours")}`,
    `Formas de atendimento: ${f("service_modes")}`,
    `Formas de pagamento: ${f("payment_methods")}`,
    `Agendamento: ${f("scheduling")}`,
    `Sem agendamento: ${f("walkin")}`,
    `Capacidade diária: ${f("daily_capacity")}`,
    `Duração média: ${f("avg_duration")}`,
    `Bio/História: ${f("bio")}`,
    `Slogan: ${f("slogan")}`,
    `Equipe: ${f("team")}`,
    `FAQ: ${f("faq")}`,
    `Restrições: ${f("restrictions")}`,
    `Áreas: ${f("areas")}`,
    `Ambiente: ${f("ambient")}`,
    `Wi-Fi: ${f("wifi")}`,
    `Estacionamento: ${f("parking")}`,
    `Acessibilidade: ${f("accessibility")}`,
    `Kid-friendly: ${f("kid_friendly")}`,
    `Cores da marca: ${client.brand_colors ?? "não informado"}`,
    `Notas internas: ${client.notes ?? "nenhuma"}`,
    ``,
    `=== JSON BRUTO DO BRIEFING ===`,
    JSON.stringify(b, null, 2),
    `=== FIM DO BRIEFING ===`,
  ];
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════
   APPROVED OUTPUTS SUMMARY
═══════════════════════════════════════════════════ */
function prevOutputs(state: AllAgentState): string {
  const parts: string[] = [];
  const labels: Record<number, string> = {
    1: "Estratégia SEO", 2: "Palavras-chave", 3: "GMB",
    4: "Estrutura do Site", 5: "Copy", 6: "Blog",
    101: "Revisão Sênior — Estratégia", 102: "Revisão Sênior — Keywords",
    103: "Revisão Sênior — GMB", 104: "Revisão Sênior — Estrutura",
    105: "Revisão Sênior — Copy", 106: "Revisão Sênior — Blog",
  };
  PIPELINE.forEach((id) => {
    if (state[id]?.status === "done" && state[id]?.output) {
      parts.push(`\n\n--- OUTPUT APROVADO: ${labels[id] ?? `Agente ${id}`} ---\n${state[id].output}`);
    }
  });
  return parts.join("");
}

/* ═══════════════════════════════════════════════════
   SYSTEM PROMPTS
═══════════════════════════════════════════════════ */
const BASE_RULE = `REGRA CRÍTICA: O briefing completo está no contexto. USE TODOS OS DADOS DISPONÍVEIS. NÃO peça informações que já estão no briefing. Se um campo estiver vazio, trabalhe com o que tem e aponte lacunas apenas ao final. Nunca bloqueie a entrega por falta de dados.

Você opera com base na metodologia PDL e no documento GMN (Google Meu Negócio) desta agência. SEMPRE aplique esses conceitos:
- O GMB não é opcional: é parte central de TODO projeto de SEO local. A criação e otimização da ficha GMB é uma entrega obrigatória, não uma sugestão.
- E-E-A-T + YMYL: avalie o nicho e adapte a estratégia ao nível de rigor exigido pelo algoritmo.
- Schema Markup obrigatório: Home (LocalBusiness), Sobre (Organization/Person), Serviços (Service), FAQ.
- sameAs: todos os perfis sociais e diretórios de classe devem ser listados no código do site.
- Categorias GMB: máximo 3, baseadas em análise dos concorrentes que já ranqueiam.
- Date de abertura: sempre espelhada no Schema foundingDate do site.
- Serviço vs. Produto: NUNCA confundir nos schemas e nas abas do GMB.

${GMN_KNOWLEDGE}`;

export function getSystemPrompt(agentId: number, clientCtx: string, state: AllAgentState): string {
  const prev = prevOutputs(state);
  const ctx = `${BASE_RULE}\n\n${clientCtx}${prev}`;

  const prompts: Record<number, string> = {
    1: `Você é o Estrategista SEO Local da agência. ${ctx}\n\nSUA ENTREGA:\n1. Posicionamento no mercado local\n2. Proposta de valor diferenciada\n3. Estratégia de presença local (GMB, site, diretórios, conteúdo)\n4. Intenção de busca do público-alvo\n5. Arquitetura geral do projeto (quais páginas e por quê)\n6. Oportunidades e riscos do segmento\n\nTom: consultivo, direto, profissional.`,

    101: `Você é o Revisor Sênior de Estratégia. Você tem acesso à internet via busca e pensa profundamente antes de responder. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DA ESTRATÉGIA:\nPara cada ponto da estratégia entregue pelo Agente 1:\n1. Valide se o posicionamento é realista e diferenciado para o mercado local\n2. Verifique se a proposta de valor é genuinamente competitiva\n3. Confirme se a estratégia de presença local está completa e atualizada com boas práticas atuais\n4. Identifique gaps, inconsistências ou oportunidades perdidas\n5. Emita veredicto por seção: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n6. Se houver itens para refazer, entregue a versão corrigida completa\n\nPense passo a passo. Seja implacável na qualidade. O cliente pagou para ter o melhor.`,

    2: `Você é o Analista de Palavras-chave da agência. ${ctx}\n\nSUA ENTREGA:\n1. Keywords primárias (3–5): nicho + cidade + variações\n2. Keywords secundárias (10–20): bairros, serviços específicos, dores\n3. Separação por intenção: Informacional | Transacional | Local\n4. Clusters temáticos com nome de cada cluster\n5. Mapeamento: cluster → página do site\n\nUse raciocínio semântico. Foque em buscas locais reais.`,

    102: `Você é o Revisor Sênior de Keywords. Você pesquisa tendências reais de busca e pensa profundamente. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DE PALAVRAS-CHAVE:\n1. Valide se as keywords primárias têm potencial real de volume local (use seu conhecimento de mercado)\n2. Verifique se há keywords de alta intenção transacional faltando\n3. Confirme se os clusters fazem sentido semântico e estratégico\n4. Identifique oportunidades de long-tail não exploradas\n5. Verifique canibalização entre clusters\n6. Emita veredicto: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n7. Entregue versão corrigida completa se necessário\n\nPense profundamente. Valide com conhecimento real de mercado.`,

    3: `Você é o Especialista em Google Meu Negócio da agência. ${ctx}\n\nSUA ENTREGA:\n1. Nome otimizado (manter ou ajustar + justificativa)\n2. Categoria principal (máxima especificidade)\n3. Categorias secundárias (2–5)\n4. Descrição (até 750 chars — informe contador XX/750)\n5. Serviços: nome + preço + descrição persuasiva\n6. Q&A estratégico (mínimo 5 pares)\n7. Script de solicitação de avaliações\n8. Orientação de geolocalização nos textos`,

    103: `Você é o Revisor Sênior de GMB. Você conhece as diretrizes atuais do Google e pensa profundamente. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DO GMB:\n1. Valide categorias contra as diretrizes atuais do Google (evite suspensões)\n2. Verifique se a descrição tem keywords naturalmente inseridas e está dentro dos 750 chars\n3. Confirme se os serviços estão descritos de forma persuasiva e otimizada\n4. Avalie o Q&A: são perguntas que potenciais clientes realmente fariam?\n5. Verifique tudo contra as políticas do Google Meu Negócio\n6. Emita veredicto: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n7. Entregue versão corrigida onde necessário`,

    4: `Você é o Arquiteto de Site SEO da agência. ${ctx}\n\nSUA ENTREGA POR PÁGINA:\n1. Mapa do site completo com URL slugs\n2. Hierarquia de navegação\n3. H1 único + H2s + H3s + CTA principal por página\n4. Orientações UX mobile-first\n5. Schema markup por página\n6. Interlinking interno\n7. Observações técnicas SEO on-page`,

    104: `Você é o Revisor Sênior de Estrutura de Site. Você conhece Core Web Vitals, UX e conversão local. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DA ARQUITETURA:\n1. Valide se a estrutura de URLs é SEO-friendly e intuitiva\n2. Verifique hierarquia: cada página tem keyword única? Há canibalização?\n3. Confirme se o interlinking está otimizado para rastreamento e autoridade\n4. Avalie se os schemas estão corretos para cada tipo de página\n5. Verifique se há pages prioritárias faltando (FAQ, área geográfica, etc.)\n6. Emita veredicto: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n7. Entregue correções completas`,

    5: `Você é o Copywriter da agência. ${ctx}\n\nSUA ENTREGA POR PÁGINA E SEÇÃO:\nHero (H1, subheadline, CTA) | Benefícios contextualizados | Serviços persuasivos | Sobre a empresa | Prova social | CTAs secundários | Rodapé\n\nESTILO OBRIGATÓRIO:\n- Linguagem humana, natural, local\n- PROIBIDO travessão IA (—)\n- PROIBIDO "não é X, é Y"\n- PROIBIDO listas genéricas sem contexto\n- Persuasão sutil, gatilhos elegantes, prova social real`,

    105: `Você é o Revisor Sênior de Copy. Você é especialista em persuasão, copywriting e marketing local. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DA COPY:\n1. Identifique frases com pegada de IA (robóticas, genéricas, padrão ChatGPT)\n2. Valide se a proposta de valor está clara no hero\n3. Verifique se os CTAs são específicos e persuasivos\n4. Confirme que a copy soa humana e conhece o negócio de verdade\n5. Identifique seções fracas ou que não convertem\n6. Emita veredicto: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n7. Reescreva as seções problemáticas`,

    6: `Você é o Redator SEO Blog da agência. ${ctx}\n\nPOR ARTIGO ENTREGUE:\nTítulo SEO | Meta (155 chars) | Introdução que prende | Desenvolvimento H2/H3 fluído | Fontes reais | Links internos (mín. 2) | CTA contextual | Sugestão de imagens\n\nMín. 2.500 palavras. 2 artigos por keyword principal. Estilo humano. NUNCA invente fontes.`,

    106: `Você é o Revisor Sênior de Blog. Você valida SEO on-page, legibilidade e precisão factual. ${ctx}\n\nSUA ENTREGA — REVISÃO CRÍTICA DOS ARTIGOS:\n1. Verifique se a keyword aparece naturalmente em heading e body\n2. Avalie se a introdução realmente prende (sem "Neste artigo")\n3. Confirme que as fontes citadas são reais e verificáveis\n4. Identifique parágrafos com pegada de IA ou com informações duvidosas\n5. Avalie se os links internos estão contextualizados\n6. Confirme que o CTA está contextual e persuasivo\n7. Emita veredicto: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER\n7. Reescreva seções problemáticas`,

    7: `Você é o Engenheiro de Prompts. ${ctx}\n\nGere 3 prompts ultra detalhados e auto-suficientes:\n\nPROMPT 1 — ESTRUTURA E LAYOUT: design (cores hex, tipografia), responsividade, UX, componentes, animações, schema\nPROMPT 2 — COPY E CONTEÚDO: todos os textos por página e seção, H1/H2/H3, CTAs\nPROMPT 3 — BLOG: estrutura dos artigos, estilo, interlinking, formatação, CTA padrão\n\nNada pode ser vago. Zero margem para a IA adivinhar algo.`,
  };

  return prompts[agentId] ?? ctx;
}

/* ═══════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════ */

/** Regular agents — Chat Completions */
export async function callRegularAgent(
  messages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message ?? "Erro na API OpenAI");
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

/** Senior agents — Responses API with web search + deep reasoning */
export async function callSeniorAgent(
  messages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  // Build input: system context + conversation
  const fullInput = [
    systemPrompt,
    ...messages.map((m) => `\n\n[${m.role === "user" ? "USUÁRIO" : "ASSISTENTE"}]: ${m.content}`),
  ].join("");

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search_preview" }],
        input: fullInput,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      // Extract text from Responses API output
      const textItems = (data.output ?? []).filter((o: Record<string, unknown>) => o.type === "message");
      const text = textItems
        .flatMap((o: Record<string, unknown>) => (o.content as Record<string, unknown>[]) ?? [])
        .filter((c: Record<string, unknown>) => c.type === "output_text")
        .map((c: Record<string, unknown>) => c.text as string)
        .join("\n");
      if (text) return text;
    }
  } catch { /* fall through to backup */ }

  // Fallback: regular call with chain-of-thought prompt
  const augmented = `${systemPrompt}\n\nAntes de responder, raciocine passo a passo internamente sobre cada ponto. Pense como um especialista sênior com 15+ anos de experiência.`;
  return callRegularAgent(messages, augmented, apiKey);
}
