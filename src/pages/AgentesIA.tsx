import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client, BriefingData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BrainCircuit, Send, CheckCircle2, Lock, Loader2,
  ChevronRight, RotateCcw, Copy, CheckCheck, User, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Types ── */
type AgentStatus = "locked" | "active" | "done";
type Role = "user" | "assistant";
interface Message { role: Role; content: string; }
interface AgentState { status: AgentStatus; output: string; messages: Message[]; }

/* ── Agent definitions ── */
const AGENTS = [
  { id: 1, emoji: "🧭", label: "Estrategista SEO Local", short: "Estratégia" },
  { id: 2, emoji: "🔍", label: "Analista de Palavras-chave", short: "Keywords" },
  { id: 3, emoji: "📍", label: "Especialista Google Meu Negócio", short: "GMB" },
  { id: 4, emoji: "🏗️", label: "Arquiteto de Site SEO", short: "Estrutura" },
  { id: 5, emoji: "✍️", label: "Copywriter", short: "Copy" },
  { id: 6, emoji: "📝", label: "Redator SEO Blog", short: "Blog" },
  { id: 7, emoji: "🚀", label: "Gerador de Prompt Final", short: "Prompts" },
];

/* ── Build client context string from briefing data ── */
function buildClientContext(client: Client): string {
  const b: BriefingData = client.briefing_data ?? {};
  const lines: string[] = [
    `DADOS DO CLIENTE:`,
    `Nome: ${client.name}`,
    `Empresa: ${client.company_name ?? b.company_name ?? "Não informado"}`,
    `Segmento/Nicho: ${client.segment ?? b.segment ?? "Não informado"}`,
    `Cidade/Estado: ${b.city_state ?? "Não informado"}`,
    `Telefone: ${b.phone ?? "Não informado"}`,
    `WhatsApp: ${b.whatsapp_response_time ?? "Não informado"}`,
    `Email: ${b.email ?? "Não informado"}`,
    `Site atual: ${client.site_url ?? b.website ?? "Não possui"}`,
    `Serviço principal: ${b.main_service ?? "Não informado"}`,
    `Outros serviços: ${b.other_services ?? "Não informado"}`,
    `Problema que resolve: ${b.problem_solved ?? "Não informado"}`,
    `Público-alvo: ${b.audience ?? "Não informado"}`,
    `Como adquire clientes hoje: ${b.acquisition ?? "Não informado"}`,
    `Diferenciais: ${b.differentiator ?? "Não informado"}`,
    `Elogios recorrentes: ${b.praises ?? "Não informado"}`,
    `Concorrentes: ${b.competitors ?? "Não informado"}`,
    `Horário de funcionamento: ${b.hours ?? "Não informado"}`,
    `Formas de atendimento: ${b.service_modes ?? "Não informado"}`,
    `Formas de pagamento: ${b.payment_methods ?? "Não informado"}`,
    `Redes sociais: ${b.socials ?? b.instagram ?? "Não informado"}`,
    `Bio/História: ${b.bio ?? "Não informado"}`,
    `Slogan: ${b.slogan ?? "Não informado"}`,
    `Equipe: ${b.team ?? "Não informado"}`,
    `FAQ do negócio: ${b.faq ?? "Não informado"}`,
    `Restrições/Observações: ${b.restrictions ?? "Não informado"}`,
    `Cores da marca: ${client.brand_colors ?? "Não informado"}`,
    `Anotações internas: ${client.notes ?? "Nenhuma"}`,
  ];
  return lines.join("\n");
}

/* ── System prompts per agent ── */
function getSystemPrompt(agentId: number, clientCtx: string, previousOutputs: Record<number, string>): string {
  const prev = (id: number) => previousOutputs[id] ? `\n\n---\nOUTPUT DO AGENTE ${id} (APROVADO):\n${previousOutputs[id]}` : "";

  const base = `Você é um funcionário especializado de uma agência de SEO local brasileira. Você executa tarefas e entrega resultados para que o dono da agência revise e aprove. Você NÃO toma decisões sem aprovação. Se faltar informação essencial, pergunte antes de avançar. Seja direto, profissional e entregue resultados prontos para uso.\n\n${clientCtx}`;

  const prompts: Record<number, string> = {
    1: `${base}\n\nVOCÊ É: Estrategista SEO Local.\nSUA FUNÇÃO: Com base nos dados do cliente acima, criar o plano estratégico completo do projeto.\nENTREGUE:\n1. Posicionamento do cliente no mercado local\n2. Proposta de valor clara e diferenciada\n3. Estratégia de presença local (GMB, site, diretórios, conteúdo)\n4. Análise de intenção de busca do público-alvo\n5. Arquitetura geral do projeto (quais páginas o site deve ter e por quê)\n6. Observações e oportunidades do segmento\n\nREGRAS: Nunca invente dados. Use APENAS o que está no briefing. Se faltar algo importante, pergunte antes. Tom: consultivo, direto, profissional. Sem linguagem genérica.`,

    2: `${base}${prev(1)}\n\nVOCÊ É: Analista de Palavras-chave.\nSUA FUNÇÃO: Com base na estratégia aprovada, gerar a pesquisa completa de palavras-chave.\nENTREGUE:\n1. Palavras-chave primárias (3–5): nicho + cidade + variações\n2. Palavras-chave secundárias (10–20): bairros, serviços específicos, dores do público\n3. Separação por intenção de busca: Informacional | Transacional | Local\n4. Clusters temáticos com nome de cada cluster\n5. Mapeamento: qual cluster representa qual página do site\n\nREGRAS: Use raciocínio semântico — sem Google Keyword Planner. Foque em buscas locais reais. Evite termos genéricos sem relevância local.`,

    3: `${base}${prev(1)}${prev(2)}\n\nVOCÊ É: Especialista Google Meu Negócio.\nSUA FUNÇÃO: Entregar tudo pronto para copiar e colar na ficha do GMB.\nENTREGUE:\n1. Nome otimizado (orientação: manter ou ajustar + justificativa)\n2. Categoria principal (1 categoria, máxima especificidade)\n3. Categorias secundárias (2–5 relevantes)\n4. Descrição da empresa (exatamente até 750 caracteres — informe o contador XX/750)\n5. Lista de serviços: nome + tipo de preço + descrição persuasiva\n6. Perguntas e respostas estratégicas (mínimo 5 pares Q&A)\n7. Orientação de geolocalização nos textos\n8. Script de solicitação de avaliações + onde posicionar QR Code\n\nREGRAS: Respeite todos os limites de caracteres reais do GMB. Nada que viole as diretrizes do Google. Palavras-chave naturais, nunca em lista forçada no nome.`,

    4: `${base}${prev(1)}${prev(2)}${prev(3)}\n\nVOCÊ É: Arquiteto de Site SEO.\nSUA FUNÇÃO: Entregar a estrutura completa do site.\nENTREGUE POR PÁGINA:\n1. Mapa do site completo com URL slugs\n2. Hierarquia de navegação (menu principal e submenus)\n3. Para cada página: H1 único (com keyword) + H2s + H3s sugeridos + CTA principal\n4. Orientações de UX e responsividade (mobile-first)\n5. Schema markup por página (LocalBusiness, Service, FAQ, Article etc.)\n6. Mapa de interlinking interno entre páginas\n7. Observações técnicas de SEO on-page\n\nREGRAS: Mobile-first obrigatório. Priorize conversão local. Uma keyword primária por página — sem canibalização.`,

    5: `${base}${prev(1)}${prev(2)}${prev(4)}\n\nVOCÊ É: Copywriter especializado em negócios locais brasileiros.\nSUA FUNÇÃO: Escrever toda a copy do site seguindo a estrutura do Arquiteto.\nENTREGUE POR PÁGINA E SEÇÃO:\n- Hero: H1, subheadline, CTA principal\n- Benefícios/Diferenciais: contextualizados, não genéricos\n- Serviços: descrição persuasiva\n- Sobre a empresa: história, missão, diferenciais humanos\n- Prova social: estrutura de depoimentos\n- CTAs secundários ao longo da página\n- Rodapé: contato, links, frase de impacto\n\nREGRAS DE ESTILO OBRIGATÓRIAS:\n- Linguagem humana, natural, local\n- PROIBIDO travessão estilo IA (—)\n- PROIBIDO estrutura "não é X, é Y"\n- PROIBIDO listas genéricas sem contexto real\n- Persuasão sutil, prova social real, gatilhos aplicados com elegância\n- Se faltar contexto do cliente, pergunte antes de escrever`,

    6: `${base}${prev(1)}${prev(2)}\n\nVOCÊ É: Redator SEO especializado em conteúdo para negócios locais.\nSUA FUNÇÃO: Gerar artigos completos para o blog do cliente.\nPARA CADA ARTIGO ENTREGUE:\n1. Título SEO (keyword + gancho emocional)\n2. Meta description (até 155 caracteres)\n3. Introdução que prende (sem "Neste artigo vamos ver...")\n4. Desenvolvimento em H2s e H3s, fluído e informativo\n5. Fontes reais verificáveis ao longo do texto (NUNCA invente)\n6. Mínimo 2 links internos contextualizados para outras páginas\n7. CTA contextual no final incentivando a contratar o serviço\n8. Sugestão de imagens (onde inserir e o que mostrar)\n\nREGRAS: Mínimo 2.500 palavras. 2 artigos por keyword principal. Estilo humano, sem excesso de bullet points, sem pegada de IA. NUNCA invente dados, estatísticas ou fontes.`,

    7: `${base}${prev(1)}${prev(2)}${prev(3)}${prev(4)}${prev(5)}${prev(6)}\n\nVOCÊ É: Engenheiro de Prompts especializado em Lovable e Antigravity.\nSUA FUNÇÃO: Transformar todos os outputs anteriores em 3 prompts ultra detalhados e auto-suficientes para criação do site.\n\nPROMPT 1 — ESTRUTURA E LAYOUT:\n- Design visual: cores exatas (hex), tipografia, espaçamentos, estilo geral\n- Responsividade: comportamento mobile de cada seção\n- UX: ordem das seções, hierarquia visual, fluxo do usuário\n- Componentes: header, hero, cards, formulários, rodapé\n- Animações e micro-interações\n- Schema markup a implementar\n\nPROMPT 2 — COPY E CONTEÚDO:\n- Todos os textos organizados por página e seção\n- H1, H2, H3 de cada página\n- Copy completa (hero, benefícios, serviços, sobre, CTAs, rodapé)\n\nPROMPT 3 — BLOG:\n- Estrutura dos artigos, estilo e tom\n- Regras de interlinking, formatação, SEO on-page\n- CTA padrão de final de artigo\n\nREGRAS: Cada prompt deve ser auto-suficiente. NADA pode ser vago — zero margem para a IA adivinhar algo.`,
  };

  return prompts[agentId] ?? base;
}

/* ── Initial states ── */
function makeInitialAgents(): Record<number, AgentState> {
  const rec: Record<number, AgentState> = {};
  AGENTS.forEach((a) => {
    rec[a.id] = { status: a.id === 1 ? "active" : "locked", output: "", messages: [] };
  });
  return rec;
}

/* ── Component ── */
export default function AgentesIA() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeAgent, setActiveAgent] = useState(1);
  const [agents, setAgents] = useState<Record<number, AgentState>>(makeInitialAgents());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* fetch clients */
  useEffect(() => {
    supabase.from("clients").select("*").order("name").then(({ data }) => {
      if (data) setClients(data as unknown as Client[]);
    });
  }, []);

  /* scroll to bottom on new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agents[activeAgent]?.messages]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const currentAgent = agents[activeAgent];
  const approvedOutputs: Record<number, string> = {};
  AGENTS.forEach((a) => {
    if (agents[a.id].status === "done") approvedOutputs[a.id] = agents[a.id].output;
  });

  /* ── Send message ── */
  async function sendMessage() {
    if (!input.trim() || loading) return;
    if (!selectedClient) { toast.error("Selecione um cliente antes de conversar."); return; }
    const key = localStorage.getItem("OPENAI_API_KEY");
    if (!key) { toast.error("Configure sua chave OpenAI em Configurações."); return; }

    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");

    const updatedMessages = [...currentAgent.messages, userMsg];
    setAgents((prev) => ({
      ...prev,
      [activeAgent]: { ...prev[activeAgent], messages: updatedMessages },
    }));
    setLoading(true);

    try {
      const systemPrompt = getSystemPrompt(
        activeAgent,
        buildClientContext(selectedClient),
        approvedOutputs
      );

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages,
          ],
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Erro na API OpenAI");
      }

      const data = await res.json();
      const reply = data.choices[0].message.content as string;
      const assistantMsg: Message = { role: "assistant", content: reply };

      setAgents((prev) => ({
        ...prev,
        [activeAgent]: {
          ...prev[activeAgent],
          messages: [...updatedMessages, assistantMsg],
          output: reply,
        },
      }));
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao chamar a IA");
    } finally {
      setLoading(false);
    }
  }

  /* ── Approve agent output ── */
  function approveAndAdvance() {
    const out = agents[activeAgent].output;
    if (!out) { toast.error("O agente ainda não entregou nenhum output para aprovar."); return; }
    const next = activeAgent + 1;
    setAgents((prev) => {
      const updated = { ...prev };
      updated[activeAgent] = { ...updated[activeAgent], status: "done" };
      if (next <= 7) {
        updated[next] = { ...updated[next], status: "active" };
        setActiveAgent(next);
      }
      return updated;
    });
    toast.success(`Agente ${activeAgent} aprovado! Avançando para o Agente ${next}.`);
  }

  /* ── Reset agent ── */
  function resetAgent(id: number) {
    setAgents((prev) => ({
      ...prev,
      [id]: { status: "active", output: "", messages: [] },
    }));
    setActiveAgent(id);
    // lock all agents after this
    for (let i = id + 1; i <= 7; i++) {
      setAgents((prev) => ({ ...prev, [i]: { ...prev[i], status: "locked", output: "", messages: [] } }));
    }
  }

  /* ── Copy last output ── */
  async function copyOutput() {
    const out = agents[activeAgent].output;
    if (!out) return;
    await navigator.clipboard.writeText(out);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  }

  /* ── Handle Enter key ── */
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const agentDef = AGENTS.find((a) => a.id === activeAgent)!;

  return (
    <div className="flex h-full min-h-0">
      {/* ── Left sidebar ── */}
      <aside className="w-64 shrink-0 border-r flex flex-col bg-sidebar">
        {/* Client selector */}
        <div className="p-4 border-b space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente ativo</p>
          <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setAgents(makeInitialAgents()); setActiveAgent(1); }}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Selecionar cliente…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.company_name ? ` — ${c.company_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient && (
            <p className="text-[11px] text-muted-foreground">
              {selectedClient.segment ?? "Segmento não informado"} · {(selectedClient.briefing_data as BriefingData)?.city_state ?? "Cidade não informada"}
            </p>
          )}
        </div>

        {/* Pipeline */}
        <div className="flex-1 overflow-auto p-3 space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2">Esteira PDL</p>
          {AGENTS.map((a, i) => {
            const st = agents[a.id].status;
            const isActive = a.id === activeAgent;
            return (
              <button
                key={a.id}
                disabled={st === "locked"}
                onClick={() => st !== "locked" && setActiveAgent(a.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all",
                  isActive && "bg-primary/10 text-primary font-semibold",
                  !isActive && st === "done" && "text-green-600 dark:text-green-400 hover:bg-green-500/10",
                  !isActive && st === "active" && "text-foreground hover:bg-accent/50",
                  st === "locked" && "opacity-35 cursor-not-allowed"
                )}
              >
                <span className="text-base shrink-0">{a.emoji}</span>
                <span className="flex-1 leading-tight text-xs">{a.label}</span>
                {st === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                {st === "locked" && <Lock className="h-3 w-3 shrink-0" />}
                {st === "active" && isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="p-3 border-t text-[10px] text-muted-foreground leading-relaxed">
          Cada agente só avança com sua aprovação explícita.
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="border-b px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center text-lg">
              {agentDef.emoji}
            </div>
            <div>
              <div className="font-semibold text-sm">{agentDef.label}</div>
              <div className="text-xs text-muted-foreground">
                {selectedClient ? `${selectedClient.name} · ${selectedClient.company_name ?? ""}` : "Nenhum cliente selecionado"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {agents[activeAgent].output && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={copyOutput}>
                {copiedOutput ? <><CheckCheck className="h-3.5 w-3.5 text-green-500" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar output</>}
              </Button>
            )}
            {agents[activeAgent].status !== "locked" && agents[activeAgent].messages.length > 0 && (
              <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-8" onClick={() => resetAgent(activeAgent)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
              </Button>
            )}
            {agents[activeAgent].output && agents[activeAgent].status !== "done" && (
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={approveAndAdvance}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprovar e avançar
              </Button>
            )}
            {agents[activeAgent].status === "done" && (
              <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/5 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Aprovado
              </Badge>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5 py-4">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3 text-muted-foreground">
              <BrainCircuit className="h-10 w-10 opacity-30" />
              <p className="text-sm">Selecione um cliente no painel lateral para iniciar a esteira.</p>
            </div>
          ) : agents[activeAgent].messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3">
              <div className="text-4xl">{agentDef.emoji}</div>
              <p className="font-semibold">Agente {activeAgent} — {agentDef.label}</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {activeAgent < 7
                  ? `Diga "Pode começar" para o agente iniciar com base nos dados do cliente ${selectedClient.name}.`
                  : `Diga "Gerar os 3 prompts finais" para o agente compilar tudo em prompts prontos para o Lovable/Antigravity.`}
              </p>
              <Button variant="outline" className="mt-2 text-sm" onClick={() => { setInput(activeAgent < 7 ? "Pode começar." : "Gerar os 3 prompts finais."); }}>
                Usar sugestão
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {agents[activeAgent].messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn("h-7 w-7 rounded-full shrink-0 grid place-items-center text-xs", msg.role === "assistant" ? "bg-primary/10" : "bg-muted")}>
                    {msg.role === "assistant" ? agentDef.emoji : <User className="h-3.5 w-3.5" />}
                  </div>
                  <Card className={cn("max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed", msg.role === "user" && "bg-primary/5 border-primary/20")}>
                    {msg.content}
                  </Card>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 shrink-0 grid place-items-center text-xs">{agentDef.emoji}</div>
                  <Card className="px-4 py-3 text-sm flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
                  </Card>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        {agents[activeAgent].status !== "locked" && (
          <div className="border-t px-4 py-3 shrink-0 flex gap-2 items-end">
            <Textarea
              className="flex-1 min-h-[60px] max-h-[140px] resize-none text-sm"
              placeholder={selectedClient ? "Digite sua mensagem (Enter para enviar, Shift+Enter para nova linha)…" : "Selecione um cliente primeiro…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!selectedClient || loading || agents[activeAgent].status === "locked"}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={sendMessage}
              disabled={!input.trim() || loading || !selectedClient}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {agents[activeAgent].status === "done" && (
          <div className="border-t px-5 py-3 bg-green-500/5 text-sm text-green-700 dark:text-green-400 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            Output aprovado. Clique em outro agente no painel para continuar ou revisar.
          </div>
        )}
      </div>
    </div>
  );
}
