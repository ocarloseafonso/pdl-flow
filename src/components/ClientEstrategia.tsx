import { useState, useRef, useEffect } from "react";
import type { Client } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  CheckCircle2,
  MessageSquare,
  Zap,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getOpenAiKey = () => localStorage.getItem("OPENAI_API_KEY") || import.meta.env.VITE_OPENAI_API_KEY || "";

/** Mapa legível dos campos do briefing */
const FIELD_LABELS: Record<string, string> = {
  responsible_name: "Nome do responsável",
  city_state: "Cidade/Estado",
  phone: "Telefone/WhatsApp",
  email: "E-mail",
  company_name: "Nome da empresa",
  segment: "Segmento",
  opening_date: "Data de abertura",
  areas: "Regiões atendidas",
  hours: "Horário de funcionamento",
  service_modes: "Forma de atendimento",
  main_service: "Principal serviço/produto",
  other_services: "Outros serviços",
  problem_solved: "Problema que resolve",
  audience: "Público-alvo",
  acquisition: "Como clientes chegam",
  differentiator: "Diferencial",
  praises: "O que os clientes elogiam",
  competitors: "Concorrentes",
  website: "Site",
  socials: "Redes sociais",
  whatsapp_response_time: "Tempo de resposta WhatsApp",
  faq: "Dúvidas frequentes",
  restrictions: "O que não faz",
  team: "Equipe",
  daily_capacity: "Capacidade diária",
  avg_duration: "Duração média do atendimento",
  scheduling: "Tipo de agendamento",
  walkin: "Atende sem agendamento",
  payment_methods: "Formas de pagamento",
  promotions: "Promoções",
  parking: "Estacionamento",
  easy_access: "Fácil acesso",
  accessibility: "Acessibilidade",
  restroom: "Banheiro para clientes",
  ambient: "Tipo de ambiente",
  covered: "Local coberto",
  wait_time: "Tempo de espera",
  wifi: "Wi-Fi",
  kid_friendly: "Adequado para crianças",
  bio: "Bio / História",
  slogan: "Slogan / Resumo",
};

function buildBriefingText(client: Client): string {
  const b = client.briefing_data ?? {};
  const lines: string[] = [
    `Cliente: ${client.name}`,
    `Empresa: ${client.company_name || "—"}`,
    `Segmento: ${client.segment || b.segment || "—"}`,
    "",
    "── RESPOSTAS DO BRIEFING ──",
  ];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const val = (b as any)[key];
    if (val && String(val).trim()) {
      lines.push(`${label}: ${val}`);
    }
  }
  return lines.join("\n");
}

/** Prompt de sistema que incorpora as diretrizes do PDL (GMN) */
const SYSTEM_PROMPT = `Você é o estrategista interno da C.E. Afonso Soluções Digitais, especialista no método PDL (Presença Digital Local).

## SOBRE O SERVIÇO PDL

O PDL é um serviço completo de Presença Digital Local para pequenos negócios locais (salões, clínicas, oficinas, restaurantes, etc.). Ele segue um fluxo em fases:

1. **Onboarding** — coleta de dados, acesso às contas, definição de estratégia
2. **Criação do Perfil Google** — criação/otimização do Google Meu Negócio (GMN) com nome, categoria, descrição, fotos, horários, serviços
3. **Verificação** — processo de verificação do perfil no Google
4. **Otimização + Site** — publicação do site vinculado ao GMN, otimização da descrição, posts iniciais, agendamento de conteúdo
5. **Citações** — cadastro do negócio em diretórios locais (Yelp, Bing Places, Apple Maps, etc.) para consistência de NAP (Nome, Endereço, Telefone)
6. **Reputação** — estratégia de captação de avaliações Google, respostas padrão, scripts de solicitação
7. **Entrega do Projeto** — relatório final, treinamento do cliente, handoff
8. **Manutenção** — posts mensais, monitoramento de avaliações, atualizações de horários/fotos

## DIRETRIZES ESTRATÉGICAS DO PDL

### Google Meu Negócio (GMN)
- **Categoria principal**: deve ser a mais específica possível. Evitar categorias genéricas.
- **Categorias secundárias**: até 9, sempre relevantes ao negócio real.
- **Descrição**: 750 caracteres max. Incluir palavra-chave local, serviços principais, diferencial. Primeira frase é crítica.
- **Serviços/Produtos**: listar todos com preços quando possível. Usar o catálogo de serviços do GMN.
- **Fotos**: mínimo 10 fotos de alta qualidade (fachada, interior, equipe, serviços em andamento, resultados). Fotos com geolocalização embutida.
- **Posts GMN**: mínimo 1 post/semana. Tipos: Oferta, Novidade, Evento. Incluir CTA.
- **Perguntas e Respostas**: criar Q&A proativamente com as dúvidas frequentes do briefing.
- **Atributos**: ativar todos os relevantes (Wi-Fi, estacionamento, acessibilidade, etc.).
- **Horários especiais**: configurar feriados e horários diferenciados.

### Site (vinculado ao GMN)
- Deve ter a mesma NAP do GMN (Nome, Endereço, Telefone exatos).
- Landing page focada em conversão local: headline com palavra-chave + localização.
- Seção de serviços, depoimentos (quando disponíveis), CTA whatsapp/ligação.
- Schema markup LocalBusiness.

### Citações
- Prioridade: Google, Bing Places, Apple Maps, Yelp, Facebook, foursquare.
- Consistência absoluta de NAP em todos os diretórios.

### Reputação
- Script de solicitação de avaliação via WhatsApp: direto, sem pressão.
- Link curto do GMN para avaliação.
- Responder 100% das avaliações (positivas em 24h, negativas em 4h).

### Posicionamento de Palavras-chave
- Foco em buscas locais: "[serviço] em [cidade]", "[serviço] perto de mim", "[bairro] [serviço]".
- Identificar a palavra-chave principal baseada no serviço + localidade.

## SUA FUNÇÃO

Dado o briefing de um cliente, você deve:
1. Analisar os dados reais do cliente
2. Gerar uma estratégia ESPECÍFICA para aquele negócio, usando as diretrizes do PDL acima
3. Indicar exatamente o que deve ser feito em cada etapa, com detalhes concretos baseados no briefing
4. Nunca ser genérico — cada recomendação deve mencionar dados reais do cliente

Responda sempre em português do Brasil, de forma direta e objetiva.`;

// ─── Funções de IA ────────────────────────────────────────────────────────────

async function callOpenAI(messages: { role: string; content: string }[]): Promise<string> {
  const key = getOpenAiKey();
  if (!key) throw new Error("Chave da OpenAI não configurada. Acesse as Configurações para adicionar.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!res.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = await res.json().catch(() => ({}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throw new Error((err as any)?.error?.message || `Erro ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function gerarEstrategia(client: Client, extraContext: string): Promise<string> {
  const briefingText = buildBriefingText(client);
  const userContent = `## BRIEFING DO CLIENTE\n\n${briefingText}${
    extraContext.trim() ? `\n\n## CONTEXTO ADICIONAL\n\n${extraContext}` : ""
  }\n\n---\n\nCom base nesses dados e nas diretrizes do PDL, gere a estratégia completa para este cliente. Organize por seções: Análise do Negócio, Estratégia GMN, Palavras-chave prioritárias, Estratégia de Fotos, Estratégia de Posts, Estratégia de Reputação, Observações Importantes.`;

  return callOpenAI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);
}

async function gerarExecucao(
  client: Client,
  estrategia: string,
  discussao: string
): Promise<string> {
  const briefingText = buildBriefingText(client);
  const userContent = `## BRIEFING\n${briefingText}\n\n## ESTRATÉGIA DEFINIDA\n${estrategia}${
    discussao.trim() ? `\n\n## AJUSTES / DECISÕES\n${discussao}` : ""
  }\n\n---\n\nGere o MATERIAL DE EXECUÇÃO PRONTO para copiar e colar. Inclua:\n\n1. **Descrição GMN** (exatamente 750 caracteres, pronta para colar)\n2. **Lista de Categorias GMN** (principal + secundárias, em ordem)\n3. **Lista de Serviços/Produtos** para o GMN (nome + breve descrição)\n4. **Atributos a ativar** no GMN\n5. **3 Posts GMN prontos** (Oferta ou Novidade, com texto + sugestão de imagem)\n6. **Script de solicitação de avaliação** (WhatsApp, pronto para enviar)\n7. **Resposta padrão para avaliações positivas** (2 variações)\n8. **Resposta padrão para avaliações negativas** (1 modelo)\n9. **Palavra-chave principal + variações** para usar no site e GMN\n10. **Headline do site** (título da landing page local)\n\nSeja 100% específico para ${client.company_name || client.name}. Sem texto genérico. Tudo pronto para copiar e usar.`;

  return callOpenAI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userContent },
  ]);
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  client: Client;
  onChange: () => void;
}

type Section = "estrategia" | "execucao";
type Status = "idle" | "loading" | "done" | "error";

export function ClientEstrategia({ client, onChange }: Props) {
  const b = client.briefing_data ?? {};
  const hasBriefing = Object.values(b).some((v) => v && String(v).trim());

  // Persisted in supabase via notes_estrategia / notes_execucao fields
  // We use client.notes as a JSON store for now (appended with special markers)
  // Better: we'll use localStorage keyed by client.id for demo, + save to notes field
  const storageKey = `pdl_estrategia_${client.id}`;

  const [estrategia, setEstrategia] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").estrategia ?? ""; } catch { return ""; }
  });
  const [discussao, setDiscussao] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").discussao ?? ""; } catch { return ""; }
  });
  const [execucao, setExecucao] = useState<string>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").execucao ?? ""; } catch { return ""; }
  });
  const [statusE, setStatusE] = useState<Status>("idle");
  const [statusX, setStatusX] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [copied, setCopied] = useState<Section | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);

  // Persist to localStorage on change
  function persist(patch: { estrategia?: string; discussao?: string; execucao?: string }) {
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "{}");
      localStorage.setItem(storageKey, JSON.stringify({ ...current, ...patch }));
    } catch (e) {
      // ignore
    }
  }

  // Also save discussao to Supabase notes when it changes (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  function handleDiscussaoChange(val: string) {
    setDiscussao(val);
    persist({ discussao: val });
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("clients")
        .update({ notes: buildNotesJson({ estrategia, discussao: val, execucao }) })
        .eq("id", client.id);
    }, 1500);
  }

  function buildNotesJson(d: { estrategia: string; discussao: string; execucao: string }) {
    return `__ESTRATEGIA__\n${JSON.stringify(d)}`;
  }

  // Load from notes on mount
  useEffect(() => {
    const raw = client.notes ?? "";
    if (raw.startsWith("__ESTRATEGIA__\n")) {
      try {
        const parsed = JSON.parse(raw.replace("__ESTRATEGIA__\n", ""));
        if (parsed.estrategia && !estrategia) { setEstrategia(parsed.estrategia); persist({ estrategia: parsed.estrategia }); }
        if (parsed.discussao && !discussao) { setDiscussao(parsed.discussao); persist({ discussao: parsed.discussao }); }
        if (parsed.execucao && !execucao) { setExecucao(parsed.execucao); persist({ execucao: parsed.execucao }); }
      } catch (e) {
        // ignore
      }
    }
  }, [client.id]);

  async function handleGerarEstrategia() {
    if (!hasBriefing) {
      toast.error("O briefing deste cliente ainda não foi preenchido.");
      return;
    }
    setStatusE("loading");
    setErrMsg("");
    try {
      const result = await gerarEstrategia(client, discussao);
      setEstrategia(result);
      persist({ estrategia: result });
      await supabase.from("clients").update({ notes: buildNotesJson({ estrategia: result, discussao, execucao }) }).eq("id", client.id);
      setStatusE("done");
      toast.success("Estratégia gerada com sucesso!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg);
      setStatusE("error");
      toast.error("Erro ao gerar estratégia: " + msg);
    }
  }

  async function handleGerarExecucao() {
    if (!estrategia) {
      toast.error("Gere a estratégia primeiro.");
      return;
    }
    setStatusX("loading");
    setErrMsg("");
    try {
      const result = await gerarExecucao(client, estrategia, discussao);
      setExecucao(result);
      persist({ execucao: result });
      await supabase.from("clients").update({ notes: buildNotesJson({ estrategia, discussao, execucao: result }) }).eq("id", client.id);
      setStatusX("done");
      toast.success("Material de execução gerado!");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrMsg(msg);
      setStatusX("error");
      toast.error("Erro ao gerar execução: " + msg);
    }
  }

  function copyText(text: string, section: Section) {
    navigator.clipboard.writeText(text);
    setCopied(section);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copiado!");
  }

  const briefingFields = Object.entries(b).filter(([, v]) => v && String(v).trim());

  return (
    <div className="space-y-5">

      {/* Banner: briefing não preenchido */}
      {!hasBriefing && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-4 flex items-start gap-3">
            <FileText className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Briefing ainda não preenchido</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A estratégia só pode ser gerada após o cliente preencher o briefing. Envie o link de acesso para ele.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo do Briefing (colapsável) */}
      {hasBriefing && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowBriefing(!showBriefing)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Dados do Briefing
                <Badge variant="secondary" className="text-xs">{briefingFields.length} campos</Badge>
              </CardTitle>
              {showBriefing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {showBriefing && (
            <CardContent className="grid sm:grid-cols-2 gap-3 text-sm border-t pt-4">
              {briefingFields.map(([key, value]) => (
                <div key={key}>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {FIELD_LABELS[key] ?? key}
                  </div>
                  <div className="text-sm mt-0.5">{String(value)}</div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* ─── Seção 1: Estratégia da IA ─────────────────────────────────── */}
      <Card className={estrategia ? "ring-1 ring-primary/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Estratégia PDL — IA
              {estrategia && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Gerada</Badge>}
            </CardTitle>
            <Button
              onClick={handleGerarEstrategia}
              disabled={statusE === "loading" || !hasBriefing}
              size="sm"
              className="gap-2"
              variant={estrategia ? "outline" : "default"}
            >
              {statusE === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analisando…</>
              ) : estrategia ? (
                <><RefreshCw className="h-4 w-4" /> Regenerar</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Gerar Estratégia</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            A IA analisa o briefing + diretrizes do PDL e sugere a estratégia completa e personalizada.
          </p>
        </CardHeader>

        {estrategia && (
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-accent/20 rounded-lg p-4 font-sans border max-h-[500px] overflow-y-auto">
                {estrategia}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 gap-1.5"
                onClick={() => copyText(estrategia, "estrategia")}
              >
                {copied === "estrategia" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "estrategia" ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </CardContent>
        )}

        {statusE === "idle" && !estrategia && hasBriefing && (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
              <Sparkles className="h-8 w-8 opacity-30" />
              <p className="text-sm">Clique em "Gerar Estratégia" para a IA analisar o briefing e sugerir o plano completo.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ─── Seção 2: Área de Discussão ────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Ajustes e Decisões
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Registre ajustes na estratégia, decisões tomadas em reunião ou contexto adicional que não estava no briefing.
            Esses dados serão usados na geração do material de execução.
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={discussao}
            onChange={(e) => handleDiscussaoChange(e.target.value)}
            placeholder={`Ex:\n- Cliente pediu para focar em delivery, não atendimento presencial\n- Cores da marca: azul escuro + branco\n- Não quer usar WhatsApp comercial, só o pessoal\n- Prioridade: avaliações no Google antes de tudo\n- Orçamento limitado para fotos, usar banco de imagens por enquanto`}
            rows={7}
            className="font-sans text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💾 Salvo automaticamente ao digitar.
          </p>
        </CardContent>
      </Card>

      {/* ─── Seção 3: Execução ─────────────────────────────────────────── */}
      <Card className={execucao ? "ring-1 ring-green-500/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Material de Execução
              {execucao && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Pronto</Badge>}
            </CardTitle>
            <Button
              onClick={handleGerarExecucao}
              disabled={statusX === "loading" || !estrategia}
              size="sm"
              className="gap-2"
              variant={execucao ? "outline" : "default"}
            >
              {statusX === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</>
              ) : execucao ? (
                <><RefreshCw className="h-4 w-4" /> Regenerar</>
              ) : (
                <><Zap className="h-4 w-4" /> Gerar Execução</>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gera todo o material prático: descrição GMN, posts prontos, script de avaliação, categorias, atributos — tudo para copiar e usar.
            {!estrategia && <span className="text-warning ml-1">(Gere a estratégia primeiro)</span>}
          </p>
        </CardHeader>

        {execucao && (
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-accent/20 rounded-lg p-4 font-sans border max-h-[600px] overflow-y-auto">
                {execucao}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-7 gap-1.5"
                onClick={() => copyText(execucao, "execucao")}
              >
                {copied === "execucao" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "execucao" ? "Copiado!" : "Copiar tudo"}
              </Button>
            </div>
          </CardContent>
        )}

        {statusX === "idle" && !execucao && estrategia && (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
              <Zap className="h-8 w-8 opacity-30" />
              <p className="text-sm">Clique em "Gerar Execução" para criar todo o material prático para copiar e aplicar.</p>
            </div>
          </CardContent>
        )}

        {statusX === "idle" && !execucao && !estrategia && (
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2 opacity-50">
              <Zap className="h-8 w-8 opacity-30" />
              <p className="text-sm">Disponível após a estratégia ser gerada.</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Erro global */}
      {errMsg && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          ⚠️ {errMsg}
        </p>
      )}
    </div>
  );
}
