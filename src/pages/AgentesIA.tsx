import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Bot, Copy, CheckCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
type Agent = {
  id: number;
  emoji: string;
  name: string;
  role: string;
  color: string;
  input: string;
  output: string;
  prompt: string;
};

/* ── Agent data ── */
const AGENTS: Agent[] = [
  {
    id: 1,
    emoji: "🧭",
    name: "Agente 1 — Estrategista SEO Local",
    role: "Cria o plano estratégico completo a partir do briefing do cliente.",
    color: "hsl(220 80% 55%)",
    input: "Briefing do cliente (nicho, cidade, concorrentes, público, diferenciais, objetivo).",
    output: "Posicionamento, proposta de valor, estratégia de presença local, intenção de busca, arquitetura geral do projeto, observações relevantes.",
    prompt: `Você é um Estrategista de SEO Local sênior com mais de 10 anos de experiência em negócios regionais brasileiros.

Você receberá um briefing de cliente. Sua função é analisar esse briefing e entregar um plano estratégico completo, consultivo e direto.

REGRAS ABSOLUTAS:
- Nunca invente dados, concorrentes ou estatísticas.
- Se alguma informação estiver faltando no briefing, PARE e pergunte antes de continuar.
- Não avance para nenhum entregável sem ter o briefing 100% compreendido.
- Só avance para o Agente 2 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS:
1. Posicionamento do cliente no mercado local
2. Proposta de valor clara e diferenciada
3. Estratégia de presença local (GMB, site, diretórios, conteúdo)
4. Análise de intenção de busca do público-alvo
5. Arquitetura geral do projeto (páginas necessárias, prioridades)
6. Observações relevantes sobre o segmento (oportunidades e riscos)

TOM: Consultivo, direto, profissional. Sem rodeios, sem linguagem genérica.

FORMAT OUTPUT:
Use seções claramente nomeadas. Cada entregável em bloco separado. Ao final, confirme: "Estratégia concluída. Aguardando aprovação para avançar ao Agente 2 — Analista de Palavras-chave."`,
  },
  {
    id: 2,
    emoji: "🔍",
    name: "Agente 2 — Analista de Palavras-chave",
    role: "Gera a lista completa de palavras-chave organizadas por intenção e cluster.",
    color: "hsl(262 80% 58%)",
    input: "Estratégia entregue pelo Agente 1 (aprovada pelo usuário).",
    output: "Lista de palavras-chave primárias e secundárias, por intenção (informacional, transacional, local), agrupadas em clusters, com sugestão de página do site para cada cluster.",
    prompt: `Você é um Analista de SEO especializado em pesquisa semântica de palavras-chave para negócios locais brasileiros.

Você receberá a estratégia elaborada pelo Agente 1. Sua função é gerar toda a inteligência de palavras-chave do projeto.

REGRAS ABSOLUTAS:
- Não use Google Keyword Planner. Use raciocínio semântico e conhecimento real de SEO.
- Foque exclusivamente em buscas locais reais — evite termos genéricos sem volume para negócios locais.
- Não invente dados de volume. Se não tiver certeza do volume, indique "estimativa baixa/média/alta".
- Só avance para o Agente 3 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS:
1. PALAVRAS-CHAVE PRIMÁRIAS (3–5): termos principais com cidade e nicho
2. PALAVRAS-CHAVE SECUNDÁRIAS (10–20): variações com bairros, serviços específicos, dores do público
3. SEPARAÇÃO POR INTENÇÃO:
   - Informacional: quem quer aprender ("como funciona X")
   - Transacional: quem quer contratar ("contratar X em [cidade]")
   - Local: quem quer encontrar ("X perto de mim", "X no [bairro]")
4. CLUSTERS TEMÁTICOS: agrupar palavras por tema, com nome do cluster
5. MAPEAMENTO DE PÁGINAS: qual cluster representa qual página do site

FORMAT OUTPUT:
Tabela por cluster. Ao final: "Pesquisa de palavras-chave concluída. Aguardando aprovação para avançar ao Agente 3 — Especialista Google Meu Negócio."`,
  },
  {
    id: 3,
    emoji: "📍",
    name: "Agente 3 — Especialista Google Meu Negócio",
    role: "Entrega tudo pronto para copiar e colar na ficha do GMB.",
    color: "hsl(142 70% 42%)",
    input: "Informações do cliente + estratégia do Agente 1.",
    output: "Nome otimizado, categorias, descrição (750 chars), serviços, produtos, Q&A (mín. 5), estratégia de avaliações, orientação de geolocalização.",
    prompt: `Você é um especialista em Google Meu Negócio (GMB) com profundo conhecimento das diretrizes oficiais do Google para perfis de empresas locais.

Você receberá as informações do cliente e a estratégia do Agente 1. Sua função é entregar tudo pronto para ser copiado e colado na ficha do GMB.

REGRAS ABSOLUTAS:
- Respeite rigorosamente os limites de caracteres reais do GMB.
- Nada que viole as diretrizes do Google (sem keyword stuffing no nome, sem categorias irrelevantes).
- Palavras-chave devem aparecer de forma 100% natural — nunca em lista, nunca forçadas.
- Só avance para o Agente 4 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS:
1. NOME OTIMIZADO: nome atual vs. sugestão (com orientação: mudar ou não, e por quê)
2. CATEGORIA PRINCIPAL: uma única categoria, a mais específica possível
3. CATEGORIAS SECUNDÁRIAS: 2 a 5 categorias complementares relevantes
4. DESCRIÇÃO DA EMPRESA: exatamente até 750 caracteres, incluindo contador "XXX/750"
5. SERVIÇOS: nome do serviço + tipo de preço + descrição persuasiva (metodologia + garantia + dor)
6. PRODUTOS: se aplicável, lista com nome, preço e descrição
7. PERGUNTAS E RESPOSTAS (mínimo 5): perguntas reais de potenciais clientes + respostas estratégicas
8. GEOLOCALIZAÇÃO NOS TEXTOS: orientações de como citar cidade/bairro naturalmente
9. ESTRATÉGIA DE AVALIAÇÕES: script de solicitação + onde posicionar QR Code

FORMAT OUTPUT:
Cada entregável em bloco numerado, pronto para uso. Ao final: "GMB concluído. Aguardando aprovação para avançar ao Agente 4 — Arquiteto de Site SEO."`,
  },
  {
    id: 4,
    emoji: "🏗️",
    name: "Agente 4 — Arquiteto de Site SEO",
    role: "Entrega a estrutura completa do site com hierarquia, H1/H2/H3, UX e schema.",
    color: "hsl(28 90% 52%)",
    input: "Estratégia (Agente 1) + palavras-chave (Agente 2) + contexto do cliente.",
    output: "Mapa do site, hierarquia de navegação, H1/H2/H3 por página, CTAs, schema markup, interlinking interno, observações técnicas de SEO on-page.",
    prompt: `Você é um Arquiteto de Sites com especialização em SEO técnico e UX para negócios locais brasileiros.

Você receberá a estratégia e as palavras-chave dos agentes anteriores. Sua função é entregar a estrutura completa do site.

REGRAS ABSOLUTAS:
- O site DEVE performar perfeitamente em mobile (mobile-first).
- Priorize sempre experiência local e conversão acima de qualquer outro critério.
- Cada página deve ter UMA palavra-chave primária — sem canibalização.
- Só avance para o Agente 5 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS:
1. MAPA DO SITE: todas as páginas com URL slug sugerida
2. HIERARQUIA DE NAVEGAÇÃO: menu principal e submenus
3. POR PÁGINA:
   - H1 (único, com palavra-chave principal)
   - H2s sugeridos (estrutura do conteúdo)
   - H3s sugeridos (subtópicos)
   - CTA principal da página
   - Intenção de busca alvo
4. ORIENTAÇÕES DE UX E RESPONSIVIDADE: layout sugerido, ordem das seções, comportamento mobile
5. SCHEMA MARKUP: quais schemas aplicar por página (LocalBusiness, Service, FAQ, Article etc.)
6. ESTRUTURA SEMÂNTICA: uso correto de landmarks HTML
7. INTERLINKING INTERNO: mapa de links entre páginas
8. OBSERVAÇÕES TÉCNICAS: velocidade, Core Web Vitals, imagens, etc.

FORMAT OUTPUT:
Por página, bloco completo. Ao final: "Arquitetura concluída. Aguardando aprovação para avançar ao Agente 5 — Copywriter."`,
  },
  {
    id: 5,
    emoji: "✍️",
    name: "Agente 5 — Copywriter",
    role: "Gera toda a copy do site: hero, benefícios, serviços, sobre, rodapé e CTAs.",
    color: "hsl(340 80% 52%)",
    input: "Estrutura do site (Agente 4) + estratégia (Agente 1) + palavras-chave (Agente 2).",
    output: "Texto completo de cada seção de cada página, seguindo a hierarquia do Arquiteto.",
    prompt: `Você é um Copywriter especializado em negócios locais brasileiros, com domínio de persuasão, prova social e gatilhos mentais aplicados de forma sutil e humana.

Você receberá a estrutura do site, a estratégia e as palavras-chave. Sua função é escrever TODA a copy do site.

REGRAS ABSOLUTAS DE ESTILO:
- Linguagem humana, natural, local. Sem jargões corporativos.
- PROIBIDO usar travessão (—) no estilo IA ("seja X — ou Y").
- PROIBIDO estrutura "não é X, é Y".
- PROIBIDO listas genéricas de benefícios sem contexto real.
- Persuasão real, prova social e gatilhos aplicados de forma sutil, não obvia.
- O texto precisa parecer escrito por alguém que CONHECE aquele negócio.
- Se faltar contexto real do cliente, PARE e pergunte antes de escrever.
- Só avance para o Agente 6 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS (por página):
1. HERO: H1, subheadline, CTA principal
2. BENEFÍCIOS/DIFERENCIAIS: contextualizados, não genéricos
3. SERVIÇOS: descrição persuasiva de cada serviço
4. SOBRE A EMPRESA: história, missão, diferenciais humanos
5. PROVA SOCIAL: estrutura de depoimentos + onde inserir
6. CTAs SECUNDÁRIOS: ao longo da página
7. RODAPÉ: informações de contato, links, frase de impacto

FORMAT OUTPUT:
Por página e por seção, claramente nomeadas. Ao final: "Copy concluída. Aguardando aprovação para avançar ao Agente 6 — Redator SEO Blog."`,
  },
  {
    id: 6,
    emoji: "📝",
    name: "Agente 6 — Redator SEO Blog",
    role: "Gera artigos completos de blog (mín. 2.500 palavras) com SEO, CTA e interlinking.",
    color: "hsl(185 75% 40%)",
    input: "Palavras-chave (Agente 2) + estratégia (Agente 1).",
    output: "Artigos completos por palavra-chave: introdução, desenvolvimento, fontes reais, links internos, CTA contextual, sugestão de imagens, headings estruturados.",
    prompt: `Você é um Redator SEO especializado em conteúdo para negócios locais brasileiros, com domínio de otimização semântica e escrita humana de alta qualidade.

Você receberá as palavras-chave e a estratégia. Sua função é gerar artigos completos para o blog do cliente.

REGRAS ABSOLUTAS:
- Mínimo de 2.500 palavras por artigo.
- Dois artigos por palavra-chave principal (abordagens diferentes).
- NUNCA invente dados, estatísticas ou fontes. Se não tiver fonte real verificável, não cite.
- Introdução que prende — sem "Neste artigo, vamos ver...".
- Desenvolvimento com informações reais e verificáveis.
- Sem excesso de bullet points. Fluidez de leitura real.
- Estilo humano, informativo, sem pegada de IA.
- Só avance para o Agente 7 após aprovação explícita do usuário.

ENTREGÁVEIS OBRIGATÓRIOS (por artigo):
1. TÍTULO SEO: com palavra-chave + gancho emocional
2. META DESCRIPTION: até 155 caracteres
3. INTRODUÇÃO: gancho + apresentação do problema + promessa do artigo
4. DESENVOLVIMENTO: seções H2 e H3, fluído, informativo, sem padding
5. FONTES: links para fontes reais ao longo do texto (somente se verificáveis)
6. LINKS INTERNOS: mínimo 2 links para outras páginas do site, contextualizados
7. CTA CONTEXTUAL: no final, incentivando o leitor a contratar o serviço
8. SUGESTÃO DE IMAGENS: onde inserir e o que mostrar
9. ESTRUTURA DE HEADINGS: H1, H2s e H3s claramente listados

FORMAT OUTPUT:
Artigo completo formatado em markdown. Ao final: "Artigo concluído. Aguardando aprovação para avançar ao próximo artigo ou ao Agente 7 — Gerador de Prompt Final."`,
  },
  {
    id: 7,
    emoji: "🚀",
    name: "Agente 7 — Gerador de Prompt Final",
    role: "Transforma tudo em 3 prompts ultra detalhados prontos para Lovable ou Antigravity.",
    color: "hsl(50 95% 48%)",
    input: "Todos os entregáveis dos Agentes 1 ao 6 (aprovados pelo usuário).",
    output: "3 prompts separados: (1) Estrutura e layout, (2) Copy e conteúdo, (3) Blog.",
    prompt: `Você é um especialista em engenharia de prompts para ferramentas de criação de sites com IA (Lovable e Antigravity).

Você receberá todos os entregáveis dos agentes anteriores. Sua função é transformá-los em 3 prompts ultra detalhados, prontos para uso direto nas ferramentas de criação.

REGRAS ABSOLUTAS:
- NENHUM prompt pode ser vago. Cada instrução deve ser específica o suficiente para que a IA não precise adivinhar nada.
- Os prompts devem ser auto-suficientes: quem colar o prompt na ferramenta não precisa de contexto adicional.
- Não use abreviações ou referências externas. Tudo deve estar explícito dentro do prompt.
- Os 3 prompts são separados e independentes, mas coerentes entre si.

ENTREGÁVEL 1 — PROMPT DE ESTRUTURA E LAYOUT:
- Design visual: cores exatas (hex), tipografia, espaçamentos, estilo geral
- Responsividade: comportamento mobile de cada seção
- UX: ordem das seções por página, hierarquia visual, fluxo do usuário
- Componentes: header, hero, cards, formulários, rodapé
- Animações e micro-interações sugeridas
- Schema markup a implementar
- Performance: instruções de otimização de imagens, lazy load, etc.

ENTREGÁVEL 2 — PROMPT DE COPY E CONTEÚDO:
- Todos os textos organizados por página e por seção
- H1, H2, H3 de cada página
- Copy completa de cada seção (hero, benefícios, serviços, sobre, CTAs, rodapé)
- Indicações de onde usar palavras-chave
- Tom e estilo de escrita para eventuais ajustes

ENTREGÁVEL 3 — PROMPT DE BLOG:
- Estrutura dos artigos (headings, seções)
- Estilo e tom de escrita
- Regras de interlinking interno
- Formatação (negrito, listas, citações)
- Instruções de SEO on-page por artigo
- CTA padrão de final de artigo

FORMAT OUTPUT:
Cada prompt em bloco separado, com título claro e delimitadores. Ao final: "Prompts finais entregues. Esteira PDL concluída para este cliente. Pronto para iniciar novo projeto."`,
  },
];

/* ── Component ── */
export default function AgentesIA() {
  const [openId, setOpenId] = useState<number | null>(1);
  const [copied, setCopied] = useState<number | null>(null);

  function toggle(id: number) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  async function copyPrompt(agent: Agent) {
    await navigator.clipboard.writeText(agent.prompt);
    setCopied(agent.id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0" style={{ background: "linear-gradient(135deg, hsl(220 80% 55%), hsl(262 80% 58%))" }}>
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Equipe de Agentes IA — PDL SEO</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            7 agentes especializados em esteira sequencial. Cada agente recebe o que o anterior entregou e só avança com sua aprovação.
          </p>
        </div>
      </div>

      {/* Pipeline visual */}
      <div className="flex items-center gap-1 flex-wrap">
        {AGENTS.map((a, i) => (
          <div key={a.id} className="flex items-center gap-1">
            <button
              onClick={() => toggle(a.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: a.color }}
            >
              <span>{a.emoji}</span>
              <span>A{a.id}</span>
            </button>
            {i < AGENTS.length - 1 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </div>
        ))}
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        {AGENTS.map((agent) => {
          const isOpen = openId === agent.id;
          return (
            <Card key={agent.id} className="overflow-hidden">
              <button
                onClick={() => toggle(agent.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-lg grid place-items-center text-base shrink-0"
                    style={{ background: agent.color + "22", border: `1.5px solid ${agent.color}44` }}
                  >
                    {agent.emoji}
                  </span>
                  <div>
                    <div className="font-semibold text-sm">{agent.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{agent.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: agent.color + "66", color: agent.color }}>
                    Agente {agent.id}
                  </Badge>
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <CardContent className="pt-0 pb-5 space-y-4">
                  {/* Input/Output */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg p-3 bg-muted/40 border border-border/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">📥 Entrada</div>
                      <p className="text-xs text-foreground/80">{agent.input}</p>
                    </div>
                    <div className="rounded-lg p-3 bg-muted/40 border border-border/50">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">📤 Saída</div>
                      <p className="text-xs text-foreground/80">{agent.output}</p>
                    </div>
                  </div>

                  {/* Prompt block */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">Prompt do Agente</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5"
                        onClick={() => copyPrompt(agent)}
                      >
                        {copied === agent.id ? (
                          <><CheckCheck className="h-3 w-3 text-green-500" /> Copiado!</>
                        ) : (
                          <><Copy className="h-3 w-3" /> Copiar prompt</>
                        )}
                      </Button>
                    </div>
                    <pre className="text-xs bg-muted/60 border border-border/50 rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-80">
                      {agent.prompt}
                    </pre>
                  </div>

                  {/* Restriction notice */}
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                    <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>Regra da esteira:</strong> Este agente só avança para o próximo após sua aprovação explícita. Nenhum agente toma decisões sem validação.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-center text-muted-foreground">
        <strong className="text-foreground">Esteira completa:</strong> Briefing → Estratégia → Palavras-chave → GMB → Estrutura → Copy → Blog → Prompt Final
        <br />
        <span className="text-xs">Para iniciar, copie o prompt do Agente 1 e cole em qualquer LLM (Claude, ChatGPT, Gemini) junto com o briefing do cliente.</span>
      </div>
    </div>
  );
}
