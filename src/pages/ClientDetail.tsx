import { useEffect, useState } from "react";
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
import { ArrowLeft, Copy, CheckCircle2, Circle, ChevronRight, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { daysBetween, formatDate } from "@/lib/dates";
import { ClientSiteBlog } from "@/components/ClientSiteBlog";
import { ClientCalendar } from "@/components/ClientCalendar";

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

      {/* Default to checklist tab */}
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">✅ Checklist da fase</TabsTrigger>
          <TabsTrigger value="resumo">Briefing</TabsTrigger>
          <TabsTrigger value="todas">Todas as fases</TabsTrigger>
          <TabsTrigger value="site">Site & Blog</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="briefing">Observações</TabsTrigger>
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
                    <label key={t.id} className="flex items-start gap-3 py-2 px-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors">
                      <Checkbox checked={false} onCheckedChange={() => toggleTask(t)} className="mt-0.5" />
                      <div>
                        <span className="text-sm font-medium">{t.title}</span>
                        {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                      </div>
                    </label>
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
