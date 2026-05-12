import React, { useEffect, useState, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Client, ClientTask, Phase } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, CheckCircle2, Circle, ChevronRight, RefreshCw, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { daysBetween, formatDate } from "@/lib/dates";
import { ClientSiteBlog } from "@/components/ClientSiteBlog";
import { ClientCalendar } from "@/components/ClientCalendar";
import RelatorioFinalAgent from "@/components/RelatorioFinalAgent";
// lazy load ClientEstrategia to isolate potential module evaluation errors
const ClientEstrategia = React.lazy(() => 
  import("@/components/ClientEstrategia").then(m => ({ default: m.ClientEstrategia }))
);

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);

  async function load() {
    if (!id) return;
    const [c, p, t] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("phases").select("*").order("position"),
      supabase.from("client_tasks").select("*").eq("client_id", id).order("phase_id").order("position"),
    ]);
    setClient(c.data as Client);
    setPhases((p.data as Phase[]) ?? []);
    setTasks((t.data as ClientTask[]) ?? []);
  }
  useEffect(() => { load(); }, [id]);

  if (!client) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  const currentPhase = phases.find((p) => p.id === client.current_phase_id);
  const currentTasks = tasks.filter((t) => t.phase_id === client.current_phase_id);
  const pendingTasks = currentTasks.filter((t) => !t.completed);
  const doneTasks = currentTasks.filter((t) => t.completed);
  const CHAT_URL = "https://novocliente.ceafonso.com.br/";
  const b = client.briefing_data ?? {};

  async function regenToken() {
    const base = (client.company_name || client.name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toLowerCase();
    const newCode = `${base}${Math.floor(100 + Math.random() * 900)}`;
    const { error } = await supabase.from("clients").update({ briefing_token: newCode }).eq("id", client!.id);
    if (error) { toast.error(error.message); return; }
    setClient({ ...client!, briefing_token: newCode });
    toast.success("Novo código gerado!");
  }

  async function toggleTask(t: ClientTask) {
    const next = !t.completed;
    setTasks((ts) => ts.map((x) => (x.id === t.id ? { ...x, completed: next, completed_at: next ? new Date().toISOString() : null } : x)));
    await supabase
      .from("client_tasks")
      .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
      .eq("id", t.id);
  }

  async function saveNotes(value: string | null) {
    setClient({ ...client!, notes: value });
    const { error } = await supabase.from("clients").update({ notes: value }).eq("id", client!.id);
    if (error) toast.error(error.message);
  }

  async function saveField(field: string, value: any) {
    const { error } = await supabase.from("clients").update({ [field]: value }).eq("id", client!.id);
    if (error) toast.error(error.message);
    else toast.success("Salvo!");
  }

  // Deadline calculations
  const deadlineDays = client.deadline_days || 30;
  const startDate = client.contract_start_date || client.created_at;
  const elapsedDays = daysBetween(startDate);
  const remainingDays = Math.max(0, deadlineDays - elapsedDays);
  const deadlinePct = Math.min(100, Math.round((elapsedDays / deadlineDays) * 100));
  const deadlineStatus = deadlinePct >= 100 ? "late" : deadlinePct >= 80 ? "warn" : "ok";

  async function advancePhase() {
    if (!currentPhase) return;
    const nextPhase = phases.find((p) => p.position === currentPhase.position + 1);
    if (!nextPhase) {
      toast.info("Este cliente já está na última fase.");
      return;
    }
    if (pendingTasks.length > 0) {
      toast.error(`Conclua as ${pendingTasks.length} tarefas pendentes antes de avançar.`);
      return;
    }
    const { error } = await supabase
      .from("clients")
      .update({ current_phase_id: nextPhase.id, phase_started_at: new Date().toISOString() })
      .eq("id", client!.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Cliente avançado para: ${nextPhase.name}`);
    load();
  }

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <Link to="/clientes" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao Kanban
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.company_name && <p className="text-muted-foreground">{client.company_name}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <Badge style={{ background: `hsl(var(--phase-${client.current_phase_id}))`, color: "white" }}>
            {currentPhase?.name}
          </Badge>
          <span className="text-sm text-muted-foreground">{daysBetween(client.phase_started_at)}d nesta fase</span>
        </div>
      </div>

      {/* Deadline bar */}
      <Card className="bg-accent/20 border-accent">
        <CardContent className="py-3 flex items-center gap-4">
          {deadlineStatus === "late" ? (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className={deadlineStatus === "late" ? "text-destructive font-semibold" : deadlineStatus === "warn" ? "text-warning font-medium" : ""}>
                {remainingDays > 0 ? `${remainingDays} dias restantes` : "Prazo expirado!"}
              </span>
              <span className="text-muted-foreground text-xs">{elapsedDays} de {deadlineDays} dias</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className={`h-full rounded-full transition-all ${deadlineStatus === "late" ? "bg-destructive" : deadlineStatus === "warn" ? "bg-warning" : "bg-primary"}`} style={{ width: `${deadlinePct}%` }} />
            </div>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            Início: {formatDate(startDate)}
          </div>
        </CardContent>
      </Card>

      {/* Default to checklist tab */}
      <Tabs defaultValue="checklist">
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="checklist">✅ Checklist da fase</TabsTrigger>
          <TabsTrigger value="estrategia">🎯 Estratégia</TabsTrigger>
          <TabsTrigger value="resumo">Briefing</TabsTrigger>
          <TabsTrigger value="todas">Todas as fases</TabsTrigger>
          <TabsTrigger value="site">Site & Blog</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="contrato">📋 Contrato</TabsTrigger>
          <TabsTrigger value="briefing">Observações</TabsTrigger>
          <TabsTrigger value="relatorio">📄 Relatório Final</TabsTrigger>
        </TabsList>


        {/* CHECKLIST — now is the default and more prominent */}
        <TabsContent value="checklist" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="phase-dot" style={{ background: `hsl(var(--phase-${client.current_phase_id}))` }} />
                  {currentPhase?.name}
                  <span className="text-muted-foreground font-normal text-sm">
                    — {doneTasks.length}/{currentTasks.length} concluídas
                  </span>
                </CardTitle>
                {pendingTasks.length === 0 && currentTasks.length > 0 && (
                  <Button size="sm" onClick={advancePhase} className="gap-1.5">
                    Avançar fase <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${doneTasks.length === currentTasks.length && currentTasks.length > 0 ? 'bg-success' : 'bg-primary'}`}
                  style={{ width: `${currentTasks.length > 0 ? Math.round((doneTasks.length / currentTasks.length) * 100) : 0}%` }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Pending tasks first with emphasis */}
              {pendingTasks.length > 0 && (
                <div className="space-y-1 mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    ⏳ Pendentes ({pendingTasks.length})
                  </div>
                  {pendingTasks.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-accent/50 transition-colors">
                      <Checkbox checked={false} onCheckedChange={() => toggleTask(t)} className="mt-0.5 cursor-pointer" />
                      <div className="flex-1">
                        <Link
                          to={`/guia?fase=${t.phase_id}`}
                          className="text-sm font-medium hover:text-primary transition-colors cursor-pointer"
                        >
                          {t.title}
                        </Link>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Completed tasks */}
              {doneTasks.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    ✅ Concluídas ({doneTasks.length})
                  </div>
                  {doneTasks.map((t) => (
                    <label key={t.id} className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors opacity-60">
                      <Checkbox checked={true} onCheckedChange={() => toggleTask(t)} className="mt-0.5" />
                      <span className="text-sm line-through text-muted-foreground">{t.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentTasks.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa para esta fase.</p>
              )}

              {/* All done message */}
              {pendingTasks.length === 0 && currentTasks.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Todas as tarefas desta fase foram concluídas!</p>
                    <p className="text-xs text-muted-foreground">Clique em "Avançar fase" para mover o cliente para a próxima etapa.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTRATÉGIA */}
        <TabsContent value="estrategia" className="mt-4">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando módulo de estratégia...</div>}>
            <ClientEstrategia client={client} onChange={load} />
          </Suspense>
        </TabsContent>

        {/* ALL PHASES OVERVIEW */}
        <TabsContent value="todas" className="mt-4 space-y-3">
          {phases.map((ph) => {
            const pTasks = tasks.filter((t) => t.phase_id === ph.id);
            const pDone = pTasks.filter((t) => t.completed).length;
            const isCurrent = ph.id === client.current_phase_id;
            const isPast = ph.position < (currentPhase?.position ?? 0);
            const isFuture = ph.position > (currentPhase?.position ?? 0);

            return (
              <Card key={ph.id} className={isCurrent ? "ring-2 ring-primary" : isFuture ? "opacity-50" : ""}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="phase-dot" style={{ background: `hsl(var(--phase-${ph.id}))` }} />
                      {ph.name}
                      {isCurrent && <Badge className="text-[10px]">Fase atual</Badge>}
                      {isPast && <Badge variant="outline" className="text-[10px] text-success border-success">Concluída</Badge>}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">{pDone}/{pTasks.length}</span>
                  </div>
                </CardHeader>
                {(isCurrent || isPast) && (
                  <CardContent className="pt-0 space-y-1">
                    {pTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs py-0.5">
                        {t.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className={t.completed ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* RESUMO */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Respostas do Briefing (Google Sheets)</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Status do Cliente" value={client.status} />
              <Field label="Última atualização do briefing" value={formatDate(client.briefing_submitted_at)} />
              
              {Object.keys(b).length > 0 ? (
                Object.entries(b).map(([key, value]) => (
                  <Field key={key} label={key} value={String(value)} />
                ))
              ) : (
                <div className="col-span-2 text-muted-foreground text-xs italic py-4">
                  Nenhuma resposta sincronizada ainda.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">🔑 Código de acesso do cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Código atual</Label>
                <div className="flex gap-2">
                  <Input readOnly value={client.briefing_token} className="font-mono font-bold tracking-widest text-base" />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(client.briefing_token); toast.success("Código copiado!"); }} title="Copiar código">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={regenToken} title="Gerar novo código">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Link do chat (enviar ao cliente)</Label>
                <div className="flex gap-2">
                  <Input readOnly value="https://novocliente.ceafonso.com.br/" className="text-xs" />
                  <Button variant="outline" size="icon" asChild>
                    <a href="https://novocliente.ceafonso.com.br/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="rounded-md border bg-accent/20 p-3 text-sm space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Mensagem pronta para WhatsApp</p>
                <p className="text-sm leading-relaxed">Olá! Para preencher seu cadastro, acesse o link abaixo e use o código de acesso:<br />🔗 https://novocliente.ceafonso.com.br/<br />🔑 Código: <strong>{client.briefing_token}</strong></p>
                <Button size="sm" variant="secondary" className="w-full gap-2" onClick={() => {
                  const msg = `Olá! Para preencher seu cadastro, acesse o link abaixo e use o código de acesso:\n\n🔗 https://novocliente.ceafonso.com.br/\n🔑 Código: ${client.briefing_token}`;
                  navigator.clipboard.writeText(msg);
                  toast.success("Mensagem copiada!");
                }}>
                  <Copy className="h-3.5 w-3.5" /> Copiar mensagem
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site" className="mt-4">
          <ClientSiteBlog client={client} onChange={load} />
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          <ClientCalendar clientId={client.id} />
        </TabsContent>

        <TabsContent value="briefing" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Observações do Cliente</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={client.notes ?? ""}
                onChange={(e) => setClient({ ...client, notes: e.target.value })}
                onBlur={() => saveNotes(client.notes)}
                placeholder="Escreva aqui anotações importantes, decisões ou histórico do cliente. O texto é salvo automaticamente ao clicar fora da caixa."
                rows={12}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTRATO */}
        <TabsContent value="contrato" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do contrato</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Data de fechamento</Label>
                <Input
                  type="date"
                  value={client.contract_start_date?.slice(0, 10) || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setClient({ ...client, contract_start_date: val });
                    saveField("contract_start_date", val);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prazo (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  value={client.deadline_days || 30}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 30;
                    setClient({ ...client, deadline_days: val });
                  }}
                  onBlur={() => saveField("deadline_days", client.deadline_days || 30)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor do contrato (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="Ex: 1500.00"
                  value={client.contract_value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : null;
                    setClient({ ...client, contract_value: val });
                  }}
                  onBlur={() => saveField("contract_value", client.contract_value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de cobrança</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={client.contract_type || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setClient({ ...client, contract_type: val });
                    saveField("contract_type", val);
                  }}
                >
                  <option value="">Selecionar...</option>
                  <option value="one_time">Pagamento único</option>
                  <option value="monthly">Mensal (recorrente)</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Resumo visual do prazo */}
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo do prazo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{elapsedDays}</div>
                  <div className="text-xs text-muted-foreground">Dias corridos</div>
                </div>
                <div>
                  <div className={`text-2xl font-bold ${deadlineStatus === "late" ? "text-destructive" : deadlineStatus === "warn" ? "text-warning" : "text-success"}`}>{remainingDays}</div>
                  <div className="text-xs text-muted-foreground">Dias restantes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{deadlineDays}</div>
                  <div className="text-xs text-muted-foreground">Prazo total</div>
                </div>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full rounded-full transition-all ${deadlineStatus === "late" ? "bg-destructive" : deadlineStatus === "warn" ? "bg-warning" : "bg-primary"}`} style={{ width: `${deadlinePct}%` }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="relatorio" className="mt-4">
          <RelatorioFinalAgent client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}
