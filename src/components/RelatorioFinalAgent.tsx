import { useState, useEffect, useRef } from "react";
import { Client } from "@/lib/types";
import { PIPELINE, AGENT_LABELS, AllAgentState, Message, buildClientContext } from "@/lib/agentConfig";
import { GMN_KNOWLEDGE } from "@/lib/gmnKnowledge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText, Lock, CheckCircle2, Loader2, Copy, CheckCheck,
  ChevronDown, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

/* ─── helpers ────────────────────────────────────────────── */
const storageKey = (clientId: string) => `pdl_agents_v2_${clientId}`;
const reportKey  = (clientId: string) => `pdl_report_${clientId}`;

function loadSession(clientId: string): AllAgentState | null {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    return raw ? (JSON.parse(raw) as AllAgentState) : null;
  } catch { return null; }
}

function loadReport(clientId: string): { parts: string[]; done: boolean } | null {
  try {
    const raw = localStorage.getItem(reportKey(clientId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveReport(clientId: string, parts: string[], done: boolean) {
  try { localStorage.setItem(reportKey(clientId), JSON.stringify({ parts, done })); } catch { /* */ }
}

function isPipelineComplete(state: AllAgentState): boolean {
  return PIPELINE.every((id) => state[id]?.status === "done");
}

function countDone(state: AllAgentState): number {
  return PIPELINE.filter((id) => state[id]?.status === "done").length;
}

function buildFullContext(state: AllAgentState, client: Client): string {
  let ctx = `=== BRIEFING DO CLIENTE ===\n${buildClientContext(client)}\n\n`;
  ctx += `=== METODOLOGIA PDL ===\n${GMN_KNOWLEDGE}\n\n`;
  ctx += `=== OUTPUTS APROVADOS DE TODOS OS AGENTES ===\n\n`;
  PIPELINE.forEach((id) => {
    if (state[id]?.status === "done" && state[id]?.output) {
      ctx += `--- ${AGENT_LABELS[id] ?? `Agente ${id}`} ---\n${state[id].output}\n\n`;
    }
  });
  return ctx;
}

/* ─── system prompt ──────────────────────────────────────── */
const REPORT_SYSTEM_PROMPT = `Você é o Agente de Relatório Final do PDL. Você foi ativado após todos os agentes terem concluído o serviço. Sua única função é gerar um relatório completo em texto para ser entregue ao cliente.

SEU PAPEL:
Você lê tudo que foi produzido pelos agentes anteriores (estratégia, palavras-chave, otimizações, conteúdo, estrutura do site, ficha do Google) e transforma isso em um relatório didático, claro e completo — escrito para um leigo entender sem dificuldade.

O relatório é somente texto. Use títulos, subtítulos e bullet points onde fizer sentido para organizar a leitura.

O QUE O RELATÓRIO DEVE CONTER:

1. O QUE FOI FEITO E POR QUÊ
Para cada entrega (site, ficha do Google, palavras-chave, diretórios etc.), explique:
- O que foi feito
- Por que foi feito
- Qual é a lógica por trás disso para o Google e para as IAs ranquearem o negócio localmente
Use dados reais do briefing e dos outputs dos agentes. Seja específico, não genérico.

2. COMO O GOOGLE E AS IAs FUNCIONAM NESSE CONTEXTO
Explique de forma acessível como funciona o ranqueamento local. Por que palavras-chave importam, por que a ficha do Google é central, como os sinais de presença local se somam. Use exemplos do próprio negócio do cliente.

3. RESULTADOS ESPERADOS E PRAZOS REALISTAS
Informe quais resultados o cliente pode esperar e em quanto tempo. Seja honesto e didático. Explique que SEO local é processo de médio prazo e que os resultados se acumulam com o tempo.

4. COMO MANTER OS RESULTADOS — O QUE O CLIENTE PRECISARÁ FAZER
Esta é a seção mais importante. Detalhe tudo que o cliente precisará executar:
- Novos artigos para o site: frequência recomendada, temas sugeridos, palavras-chave a trabalhar (entregue as palavras-chave — sem segredo, o valor está na execução)
- Postagens na Ficha do Google (GMB): frequência ideal (ex: toda semana), tipo de conteúdo e por que ajuda no ranqueamento
- Solicitação de avaliações: quando e como pedir avaliações, com base no nicho. Dê exemplos práticos de abordagem
- Consistência e frequência: deixe claro que manter a frequência não é opcional — é o que sustenta o posicionamento conquistado

5. O PAPEL DA CONCORRÊNCIA
Com base no nicho e região do cliente, informe o nível competitivo local. Deixe claro que o posicionamento conquistado não é permanente — concorrentes que perceberem o avanço e agirem podem tornar a reconquista mais difícil. A frequência de manutenção é o que mantém a vantagem. Use um tom factual, não alarmista.

6. DICAS PARA ACELERAR RESULTADOS
Sugestões práticas e específicas para o nicho: incentivar avaliações em momentos-chave, responder comentários, usar fotos reais no GMB, entre outras ações que o próprio cliente pode adotar no dia a dia.

TOM E LINGUAGEM:
- Escreva como se estivesse explicando para alguém inteligente que não é da área
- Use exemplos reais e simples do próprio negócio
- Nunca use jargões sem explicar o que significam
- Seja direto, objetivo e respeitoso
- A dificuldade que o cliente vai sentir deve vir da quantidade e complexidade das tarefas de manutenção — nunca da dificuldade de entender o que está escrito

O QUE VOCÊ NÃO DEVE FAZER:
- Não ofereça, sugira ou insinue serviços de manutenção mensal
- Não tente vender nada
- Não faça o cliente se sentir incapaz — apenas apresente o trabalho com clareza
- Não omita informações por achar que é "segredo técnico" — transparência total

SE O RELATÓRIO FICAR MUITO LONGO E VOCÊ NÃO CONSEGUIR TERMINAR EM UMA RESPOSTA:
Termine o que estava escrevendo, escreva exatamente esta linha ao final: "---CONTINUAR---"
Não escreva mais nada após essa linha. O usuário vai clicar em "Continuar" e você retomará do ponto exato onde parou.`;

/* ─── component ──────────────────────────────────────────── */
interface Props { client: Client; }

export default function RelatorioFinalAgent({ client }: Props) {
  const [session, setSession]     = useState<AllAgentState | null>(null);
  const [parts, setParts]         = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* load on mount */
  useEffect(() => {
    const s = loadSession(client.id);
    setSession(s);
    const saved = loadReport(client.id);
    if (saved) { setParts(saved.parts); setIsComplete(saved.done); }
  }, [client.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [parts]);

  const fullText    = parts.join("\n\n");
  const needsContinue = !isComplete && parts.length > 0 && fullText.includes("---CONTINUAR---");
  const cleanText   = fullText.replace(/---CONTINUAR---/g, "").trim();
  const done        = session ? countDone(session) : 0;
  const complete    = session ? isPipelineComplete(session) : false;

  async function generate(isContinuation = false) {
    if (!session) return;
    const key = localStorage.getItem("OPENAI_API_KEY");
    if (!key) { toast.error("Configure sua chave OpenAI em Configurações."); return; }

    setLoading(true);
    try {
      const context = buildFullContext(session, client);
      const messages: Message[] = isContinuation
        ? [
            { role: "user", content: `${context}\n\nHistórico do relatório gerado até agora:\n${cleanText}` },
            { role: "assistant", content: "Certo, vou continuar o relatório de onde parei." },
            { role: "user", content: "Continue o relatório do ponto onde parou. Não repita nada que já foi escrito. Continue diretamente." },
          ]
        : [{ role: "user", content: `${context}\n\nGere o Relatório Final completo para o cliente agora.` }];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: REPORT_SYSTEM_PROMPT },
            ...messages,
          ],
          temperature: 0.65,
          max_tokens: 4000,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error?.message ?? "Erro na API");
      }

      const data = await res.json();
      const reply = data.choices[0].message.content as string;
      const newParts = isContinuation ? [...parts.map(p => p.replace("---CONTINUAR---", "")), reply] : [reply];
      const finished = !reply.includes("---CONTINUAR---");

      setParts(newParts);
      setIsComplete(finished);
      saveReport(client.id, newParts, finished);
      if (finished) toast.success("Relatório finalizado!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    await navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function resetReport() {
    localStorage.removeItem(reportKey(client.id));
    setParts([]);
    setIsComplete(false);
  }

  /* ── locked state ── */
  if (!session || !complete) {
    return (
      <Card className="p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[200px]">
        <Lock className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="font-semibold text-sm">Relatório Final bloqueado</p>
          <p className="text-xs text-muted-foreground mt-1">
            {session
              ? `${done}/${PIPELINE.length} etapas concluídas na Esteira PDL. Finalize todos os agentes para desbloquear.`
              : "Nenhuma sessão de agentes encontrada para este cliente. Inicie a Esteira PDL primeiro."}
          </p>
        </div>
        {session && (
          <div className="w-full max-w-xs">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${(done / PIPELINE.length) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{done}/{PIPELINE.length} etapas</p>
          </div>
        )}
      </Card>
    );
  }

  /* ── ready / generated ── */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 grid place-items-center">
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-sm">Agente de Relatório Final</p>
            <p className="text-[11px] text-muted-foreground">
              {isComplete ? "Relatório completo gerado" : parts.length > 0 ? "Relatório parcial — clique em Continuar" : "Pronto para gerar"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {parts.length > 0 && (
            <>
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={copyReport}>
                {copied ? <><CheckCheck className="h-3 w-3 text-green-500" />Copiado</> : <><Copy className="h-3 w-3" />Copiar tudo</>}
              </Button>
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7 text-destructive/70 hover:text-destructive" onClick={resetReport}>
                <RefreshCw className="h-3 w-3" />Resetar
              </Button>
            </>
          )}
          {isComplete && (
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> Completo
            </Badge>
          )}
        </div>
      </div>

      {/* Empty state */}
      {parts.length === 0 && (
        <Card className="p-8 flex flex-col items-center gap-4 text-center border-dashed border-emerald-500/30 bg-emerald-500/5">
          <FileText className="h-10 w-10 text-emerald-500/40" />
          <div>
            <p className="font-semibold text-sm">Todos os agentes finalizados</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Clique abaixo para gerar o relatório completo para apresentar ao cliente.
              O relatório consolida toda a estratégia, execução e orientações de manutenção.
            </p>
          </div>
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => generate(false)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Gerar Relatório Final
          </Button>
        </Card>
      )}

      {/* Report content */}
      {parts.length > 0 && (
        <Card className="overflow-hidden">
          <ScrollArea className="max-h-[600px]">
            <div className="p-5">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-foreground">
                {cleanText}
              </pre>
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Gerando continuação…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Continue button */}
      {needsContinue && !loading && (
        <Card className="p-4 flex items-center justify-between border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            O relatório ainda não foi concluído. Clique para continuar gerando.
          </div>
          <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shrink-0" onClick={() => generate(true)}>
            <ChevronDown className="h-3.5 w-3.5" /> Continuar relatório
          </Button>
        </Card>
      )}

      {/* Regenerate button (when complete) */}
      {isComplete && !loading && (
        <div className="flex justify-center">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={() => { resetReport(); setTimeout(() => generate(false), 100); }}>
            <RefreshCw className="h-3 w-3" /> Regenerar relatório
          </Button>
        </div>
      )}
    </div>
  );
}
