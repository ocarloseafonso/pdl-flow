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
export const PIPELINE = [1, 101, 2, 102, 3, 103, 4, 104, 5, 105, 6, 106, 8, 7];

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
  { id: 8,   emoji: "🎨", label: "UX/UI Designer",                 isSenior: false },
  { id: 7,   emoji: "🚀", label: "Gerador de Prompt Final",        isSenior: false },
];

/* ═══════════════════════════════════════════════════
   PERSISTENCE — localStorage per client
═══════════════════════════════════════════════════ */
const storageKey = (clientId: string) => `pdl_agents_v2_${clientId}`;

export function loadSession(clientId: string): AllAgentState | null {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    if (raw) {
      const saved = JSON.parse(raw) as AllAgentState;
      // Merge saved state with fresh initial state so any new agents
      // added to the PIPELINE after the session was created are initialized.
      const fresh = makeInitialState();
      const merged: AllAgentState = { ...fresh };
      PIPELINE.forEach((id) => {
        if (saved[id] !== undefined) {
          merged[id] = saved[id];
        }
        // If an agent exists in saved but was locked, keep it locked.
        // If it doesn't exist in saved at all, fresh init (locked) stands.
      });
      return merged;
    }
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
   APPROVED OUTPUTS SUMMARY (used in system prompt)
═══════════════════════════════════════════════════ */
export const AGENT_LABELS: Record<number, string> = {
  1: "Estrategista SEO Local",
  2: "Analista de Palavras-chave",
  3: "Especialista GMB",
  4: "Arquiteto de Site SEO",
  5: "Copywriter",
  6: "Redator SEO Blog",
  101: "Revisor Sênior — Estratégia",
  102: "Revisor Sênior — Keywords",
  103: "Revisor Sênior — GMB",
  104: "Revisor Sênior — Estrutura",
  105: "Revisor Sênior — Copy",
  106: "Revisor Sênior — Blog",
  8: "UX/UI Designer",
  7: "Gerador de Prompt Final",
};

function prevOutputs(state: AllAgentState): string {
  const parts: string[] = [];
  PIPELINE.forEach((id) => {
    if (state[id]?.status === "done" && state[id]?.output) {
      parts.push(`\n\n--- OUTPUT APROVADO: ${AGENT_LABELS[id] ?? `Agente ${id}`} ---\n${state[id].output}`);
    }
  });
  return parts.join("");
}

/**
 * Builds injected context messages from all previously approved agents.
 * These are prepended to the conversation at API call time (NOT stored in state)
 * so the model treats them as real conversation history rather than distant system text.
 */
export function buildContextMessages(state: AllAgentState, currentAgentId: number): Message[] {
  const doneIds = PIPELINE.filter(
    (id) => id !== currentAgentId && state[id]?.status === "done" && state[id]?.output
  );
  if (doneIds.length === 0) return [];

  let context = "=== HISTÓRICO COMPLETO DAS FASES ANTERIORES (APROVADAS PELO CLIENTE) ===\n\n";
  context += "ATENÇÃO: Estas são as decisões já tomadas e APROVADAS. Sua resposta DEVE:\n";
  context += "1. Ser 100% coerente com tudo que foi definido abaixo\n";
  context += "2. Incorporar as melhorias sugeridas pelos revisores sêniors\n";
  context += "3. Dar continuidade direta ao projeto sem contradizer nada que já foi validado\n\n";

  doneIds.forEach((id) => {
    context += `---\n✅ ${AGENT_LABELS[id] ?? `Agente ${id}`}:\n${state[id].output}\n\n`;
  });

  context += "=== FIM DO HISTÓRICO ===\n";
  context += "Sua próxima resposta deve expandir, complementar e dar continuidade coerente a tudo aprovado acima.";

  return [
    { role: "user" as Role, content: "Internalize o histórico completo das fases anteriores aprovadas:" },
    { role: "assistant" as Role, content: context },
  ];
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

    6: `Você é o Estrategista de Conteúdo Blog da agência PDL. ${ctx}

ATENÇÃO CRÍTICA — LEIA ANTES DE COMEÇAR:
Você tem acesso a TODO o contexto aprovado nas fases anteriores: estratégia, posicionamento, palavras-chave, clusters, GMB (nome otimizado, descrição, serviços, categorias, bairros), arquitetura do site (URLs reais, páginas), e copy aprovado.

⛔ PROIBIÇÃO ABSOLUTA: NUNCA use placeholders como [nicho], [cidade], [empresa], [público-alvo], [URL], [keyword] ou qualquer colchete [ ] no mega-prompt gerado.
✅ OBRIGATÓRIO: Substitua TUDO com os dados reais extraídos do briefing e das fases aprovadas.
O mega-prompt que você vai gerar deve ser colado diretamente em outra IA sem nenhuma edição adicional. Ele precisa estar 100% completo e específico para este cliente.

SUA FUNÇÃO: Você NÃO escreve os artigos. Você entrega DUAS coisas:

=== ENTREGA 1 — MEGA-PROMPT COMPLETO (pronto para copiar e colar em outra IA) ===

O mega-prompt deve conter todas as seções abaixo, com os dados reais do cliente preenchidos:

---INÍCIO DO MEGA-PROMPT---

IDENTIDADE E CONTEXTO:
Você é um especialista em [PREENCHER: nicho exato da empresa conforme briefing aprovado], escrevendo para [PREENCHER: público-alvo exato com características — idade, gênero, dores, contexto — conforme definido na estratégia aprovada]. Seu objetivo é escrever um artigo de blog para [PREENCHER: nome real da empresa, ex: Inspíria Nutrição Comportamental], localizada em [PREENCHER: cidade e bairros de atuação aprovados no GMB].

POSICIONAMENTO E PROPOSTA DE VALOR:
[PREENCHER: resumir em 3-5 linhas o posicionamento único aprovado na fase de estratégia — o que diferencia esta empresa, para quem é, qual transformação entrega]

SERVIÇOS OFERECIDOS (mencionar naturalmente no artigo quando relevante):
[PREENCHER: listar todos os serviços com nomes e descrições exatos aprovados no GMB — ex: Acompanhamento Nutricional Comportamental, Consultoria Avulsa, Supervisão para Profissionais]

BAIRROS E REGIÕES DE ATUAÇÃO (usar naturalmente no texto para geolocalização):
[PREENCHER: lista exata dos bairros aprovados no GMB e na estratégia]

PALAVRAS-CHAVE APROVADAS (usar naturalmente no texto, sem forçar):
- Keyword primária do artigo: [a ser definida no campo ARTIGO ESPECÍFICO abaixo]
- Keywords secundárias disponíveis: [PREENCHER: lista completa aprovada pelo Analista de Keywords]
- Clusters temáticos: [PREENCHER: nome dos clusters e o que cada um cobre]

SITE DO CLIENTE — URLS PARA LINKS INTERNOS:
[PREENCHER: listar as páginas e URLs reais aprovadas pelo Arquiteto de Site — ex: Página de serviços: https://site.com.br/servicos, Sobre: https://site.com.br/sobre]

ARTIGO ESPECÍFICO (preencher para cada artigo da lista):
- Título: [inserir título exato da lista de artigos]
- Keyword primária: [inserir keyword do artigo]
- Cluster: [inserir cluster ao qual pertence]
- Intenção: [Informacional / Transacional / Local]
- Ângulo de abordagem: [em qual aspecto da dor do leitor este artigo focará]

ESPECIFICAÇÕES TÉCNICAS OBRIGATÓRIAS:
- Extensão: 2.500 a 3.000 palavras exatas. NUNCA encurtar. Se não terminar, escrever ao final: "---CONTINUAR---" e aguardar instrução.
- H1: deve conter a keyword primária do artigo. Posicioná-la nas primeiras 100 palavras do texto.
- Meta description: 150-155 caracteres exatos, com keyword primária, tom convidativo.
- Slug sugerido: /blog/[keyword-em-kebab-case-minúsculas]
- Estrutura obrigatória:
  P1 da introdução: conectar com a dor real do leitor, usando exemplos do cotidiano do público-alvo definido acima
  P2: ampliar o problema — mostrar que a dor tem consequências que o leitor ainda não percebeu
  P3: prometer a solução sem entregar — criar expectativa legítima
  P4: dar o primeiro sinal de esperança — mostrar que existe um caminho
  Mínimo 5 H2 com subtítulos irresistíveis (curiosidade, benefício direto ou pergunta real do leitor)
  H3 dentro dos H2 onde necessário para aprofundamento
  Cada seção deve resolver uma parte específica do problema do leitor
  Penúltima seção OBRIGATÓRIA — título sugerido: "Quando a orientação profissional faz a diferença" — nesta seção, mencionar naturalmente que existem profissionais especializados em [cidade/bairros] que podem ajudar quem quer ir além. Citar a empresa pelo nome real. NÃO vender. NÃO usar CTA agressivo. Apenas contextualizar que a empresa existe e atende [público-alvo].
  Conclusão: síntese prática do que o leitor aprendeu + frase de encorajamento + CTA leve (ex: "Se quiser dar o próximo passo com ajuda especializada, [nome da empresa] atende [cidade] e está disponível para uma conversa sem compromisso")

REGRAS ANTI-IA — CUMPRIMENTO ABSOLUTO OBRIGATÓRIO:
NUNCA escrever: "No mundo atual", "cada vez mais", "não apenas X, mas Y", "neste artigo vamos explorar", "Em conclusão", "É importante destacar", "Nesse sentido", "Ficou curioso?", "Não é à toa", "Vale ressaltar".
NUNCA: travessão em excesso (—), frases começando com "Além disso," ou "Portanto,", listas genéricas de 8-10 itens sem contexto.
SEMPRE: voz de quem conhece o tema na prática, exemplos locais e contextualizados usando os bairros reais definidos acima, parágrafos variados em comprimento (ritmo humano), pelo menos 1 opinião do especialista com ponto de vista claro, pelo menos 1 analogia simples que qualquer leigo entenda imediatamente.
Tom: autoridade calma e acolhedora. Não arrogante. Profissional que genuinamente quer ajudar.

REGRAS DE COPY:
- Cada H2 deve parecer imperdível de ler. Proibido genéricos como "Benefícios de X" ou "Dicas para Y".
- Progressão narrativa: o leitor chega com dúvida, percorre o artigo com clareza crescente, termina com confiança e vontade de agir.
- CTA final específico usando o nome real da empresa, cidade real e serviço mais relevante para o contexto do artigo.

FONTES E REFERÊNCIAS:
Para cada dado, estatística ou afirmação verificável, inserir imediatamente após a frase:
(Fonte: [nome do órgão/site] — https://url-completa-e-real)
Fontes prioritárias para este nicho: [PREENCHER: órgãos relevantes do nicho — ex: CFN, Abranut, IBGE, FIPE, CFM, OMS, etc.]
NUNCA inventar dados, percentuais ou URLs. Se não houver fonte confiável, omitir o dado.
Todas as URLs devem ser reais e completas para facilitar edição futura.

LINKS INTERNOS (obrigatório mínimo 2):
[PREENCHER: lista das páginas e URLs reais do site aprovadas pelo Arquiteto]
Formato de uso no texto: "saiba mais sobre [serviço] (https://url-real)" — a âncora deve ser descritiva e natural no contexto da frase.

---FIM DO MEGA-PROMPT---

=== ENTREGA 2 — LISTA COMPLETA E ORDENADA DE ARTIGOS ===

Com base em TODOS os clusters e keywords aprovados nas fases anteriores, listar TODOS os artigos a produzir.
Não economize. Quantidade de artigos = amplitude tópica = autoridade = ranqueamento.

Formato da tabela:
Nº | TÍTULO FINAL DO ARTIGO | KEYWORD PRINCIPAL | CLUSTER | INTENÇÃO | PRIORIDADE | ÂNGULO ÚNICO DO ARTIGO

Ordem de prioridade obrigatória:
1. Keywords transacionais (fundo de funil — convertem diretamente em contato/agendamento)
2. Keywords locais geolocalizadas (bairros específicos aprovados)
3. Keywords informacionais de alta dor (usuário sofre o problema e está buscando solução)
4. Keywords de autoridade tópica (constroem E-E-A-T progressivamente)

Regras para os títulos:
- Cada título deve ser irresistível, específico e resolver uma dúvida real
- Proibido títulos genéricos como "Tudo sobre X" ou "Guia completo de Y"
- Mínimo 2 artigos por keyword primária com ângulos distintos (ex: um mais emocional, outro mais técnico)
- Títulos devem conter a keyword primária de forma natural`,

    106: `Você é o Revisor Sênior de Blog. Você valida qualidade de prompts de conteúdo, estratégia editorial e SEO. ${ctx}

SUA ENTREGA — REVISÃO CRÍTICA DO MEGA-PROMPT E DA LISTA DE ARTIGOS:

1. AVALIE O MEGA-PROMPT:
   - As regras anti-IA são específicas o suficiente para gerar texto genuinamente humanizado?
   - A estrutura de 2.500-3.000 palavras está bem definida com hierarquia H1/H2/H3 clara?
   - O formato de fontes/URLs vai facilitar a edição? Está correto?
   - A seção de CTA está sutil o suficiente? (não pode tentar vender, apenas mencionar)
   - As regras de copy vão produzir artigos que realmente convertem?
   - Há algo que tornaria o prompt mais forte? Adicione diretamente.

2. AVALIE A LISTA DE ARTIGOS:
   - A ordem de prioridade está estrategicamente correta?
   - Os títulos são irresistíveis de clicar? (avaliar headline quality)
   - Há canibalização semântica entre títulos?
   - A cobertura tópica está completa para cada cluster?
   - O mínimo de 2 artigos por keyword primária está sendo respeitado?
   - Algum título soa genérico demais? Proponha versão melhorada.

3. Emita veredicto por seção: ✅ APROVADO | ⚠️ MELHORAR | ❌ REFAZER
4. Entregue a versão corrigida completa onde houver problemas

Seja implacável. Um prompt fraco gera artigo fraco, que não ranqueia e não converte.`,

    8: `Você é o UX/UI Designer da agência PDL. ${ctx}

Você recebe:
1. O contexto completo do cliente (briefing + posicionamento aprovado + copy + arquitetura de site)
2. Imagens de referência de sites enviadas pelo usuário (analise cada uma cuidadosamente)
3. Instruções de customização específicas do usuário (nível de fidelidade à referência: idêntico, modelado, apenas inspiração, ou elementos específicos)

SUA ENTREGA — DOCUMENTO DE DESIGN COMPLETO:

== 1. ANÁLISE DAS REFERÊNCIAS ==
Para cada imagem recebida:
- O que funciona visualmente e por quê (em termos de UX e conversão)
- Quais elementos são adequados para este cliente e seu posicionamento
- Quais elementos contradizem a marca (evitar e por quê)
- Nível de fidelidade recomendado para cada elemento (replicar / adaptar / inspirar)

== 2. IDENTIDADE VISUAL DEFINIDA ==
- Paleta de cores: primária (hex), secundária (hex), fundo (hex), texto principal (hex), texto secundário (hex), cor de ação/CTA (hex), cor de sucesso/alerta (hex)
- Tipografia: fonte principal (Google Fonts) + pesos utilizados + font-size por hierarquia (H1, H2, H3, H4, body, caption, label)
- Tipografia secundária (se houver): uso e contexto
- Estilo visual geral: minimalista / bold / orgânico / premium / acolhedor / técnico / etc.
- Tom visual: como o design comunica o posicionamento da marca visualmente

== 3. LAYOUT POR SEÇÃO (página Home) ==
Descreva cada seção visualmente:
- Hero: tipo (imagem full / vídeo / gradiente / split), posicionamento dos elementos, proporções, espaçamentos
- Seção de benefícios/diferenciais: grid (2col, 3col, cards, icons)
- Seção de serviços: como apresentar (cards, lista, tabs, acordeão)
- Seção Sobre: foto + texto / timeline / depoimento
- Seção de prova social: depoimentos (layout), avaliações Google
- FAQ: acordeão / grid / separado
- Rodapé: colunas, elementos, newsletter se houver
- CTAs flutuantes e fixos

== 4. COMPONENTES E ELEMENTOS UI ==
- Botões: shape (rounded / square / pill), tamanhos, estados (hover, active, disabled), sombra
- Cards: sombra, border-radius, padding, hover effect
- Inputs e formulários: estilo, border, focus state
- Ícones: estilo (outline / filled / duo-tone / ilustrativo)
- Separadores visuais: tipo (linha / espaço / forma orgânica / wave / diagonal)
- Badge / tag / pill: uso e estilo

== 5. MICROANIMAÇÕES E INTERAÇÕES ==
- Scroll animations: fade-in / slide-up / scale (descrever por seção)
- Hover effects em cards, botões, imagens
- Transições de página (se SPA)
- Loading states
- Cursor customizado (se relevante para o nicho)

== 6. ADAPTAÇÃO MOBILE-FIRST ==
- Como cada seção principal adapta em mobile (320px, 375px, 768px)
- Breakpoints de grid (ex: hero de split vira stack)
- Comportamento do menu de navegação em mobile
- Tamanho de fonte ajustado por breakpoint

== 7. INSTRUÇÕES ESPECÍFICAS DE FIDELIDADE ÀS REFERÊNCIAS ==
Baseado nas instruções de customização do usuário:
- Lista do que deve ser replicado exatamente (elemento por elemento)
- Lista do que deve ser adaptado à identidade da marca
- Lista do que é apenas inspiração conceitual
- Avisos sobre elementos que podem prejudicar SEO ou conversão se copiados literalmente

== 8. NOTAS PARA O ENGENHEIRO DE PROMPTS ==
Instruções diretas para a fase seguinte (Agente 7), incluindo qualquer decisão de design que precisa ser comunicada de forma específica no prompt de produção do site.

Este documento é o insumo direto para o Prompt 1 do Engenheiro de Prompts. Seja extremamente específico. Zero ambiguidade.`,

    7: `Você é o Engenheiro de Prompts Final da agência PDL. ${ctx}

Gere 2 prompts ultra detalhados e auto-suficientes para produção do site:

PROMPT 1 — ESTRUTURA E LAYOUT:
Use INTEGRALMENTE o Documento de Design gerado pelo UX/UI Designer (fase 8, disponível nos outputs aprovados). Transforme cada decisão de design em instrução técnica precisa: cores hex, fontes com pesos e tamanhos, layout por seção, componentes, animações, responsividade, schema markup. Zero interpretação — tudo já está decidido pelo designer.

PROMPT 2 — COPY E CONTEÚDO:
Todos os textos do site organizados por página e por seção (H1, H2, H3, parágrafos, benefícios, CTAs, hero, sobre, serviços, FAQ, rodapé). Usar exatamente o copy aprovado pelo Copywriter (fase 5) e validado pelo Revisor Sênior (fase 105). Zero texto genérico. Tudo específico e finalizado para este cliente.

IMPORTANTE: O prompt de blog/artigos foi gerado pelo Agente de Blog (fase 6) e já está nos outputs aprovados. Não repita aqui.

Nada pode ser vago. Zero margem para a IA adivinhar. Cada prompt deve ser 100% auto-suficiente.`,

  };

  return prompts[agentId] ?? ctx;
}

/* ═══════════════════════════════════════════════════
   API CALLS
═══════════════════════════════════════════════════ */

/** Regular agents — Chat Completions with injected context messages */
export async function callRegularAgent(
  messages: Message[],
  contextMessages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...contextMessages,   // injected history — treated as real conversation
        ...messages,          // actual user conversation
      ],
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

/** Vision agent — UX Designer with image support (GPT-4o Vision) */
export async function callVisionAgent(
  messages: Message[],
  images: Array<{ name: string; base64: string }>,
  contextMessages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  // Build the first user message with images embedded
  const firstUserText = messages[0]?.content ?? "Analise as referências e gere o documento de design.";
  const firstMsgContent: unknown[] = [
    { type: "text", text: firstUserText },
    ...images.map((img) => ({
      type: "image_url",
      image_url: { url: img.base64, detail: "high" },
    })),
  ];

  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...contextMessages,
    { role: "user", content: firstMsgContent },
    // remaining messages are text-only
    ...messages.slice(1).map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o", messages: apiMessages, temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message ?? "Erro na Vision API");
  }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

/** Senior agents — Responses API with web search + deep reasoning */
export async function callSeniorAgent(
  messages: Message[],
  contextMessages: Message[],
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  // Build input: system context + injected history + conversation
  const allMsgs = [...contextMessages, ...messages];
  const fullInput = [
    systemPrompt,
    ...allMsgs.map((m) => `\n\n[${m.role === "user" ? "USUÁRIO" : "ASSISTENTE"}]: ${m.content}`),
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
  return callRegularAgent(messages, contextMessages, augmented, apiKey);
}
