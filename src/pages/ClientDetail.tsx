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
import { ArrowLeft, Copy } from "lucide-react";
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
  const link = `${window.location.origin}/briefing/${client.briefing_token}`;
  const b = client.briefing_data ?? {};

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

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="checklist">Checklist da fase</TabsTrigger>
          <TabsTrigger value="site">Site & Blog</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados básicos</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <Field label="Nome do responsável" value={b.responsible_name || b.full_name} />
              <Field label="Cidade / Estado" value={b.city_state} />
              <Field label="Telefone" value={b.phone} />
              <Field label="E-mail" value={b.email} />
              <Field label="Bairros atendidos" value={b.areas} />
              <Field label="Horário" value={b.hours} />
              <Field label="Briefing recebido" value={formatDate(client.briefing_submitted_at)} />
              <Field label="Status" value={client.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Link do briefing</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input readOnly value={link} className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copiado"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                value={client.notes ?? ""}
                onChange={(e) => setClient({ ...client, notes: e.target.value })}
                onBlur={() => saveNotes(client.notes)}
                placeholder="Notas, decisões, contexto…"
                rows={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {currentPhase?.name} — {currentTasks.filter((t) => t.completed).length}/{currentTasks.length} concluídas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentTasks.map((t) => (
                <label key={t.id} className="flex items-start gap-3 py-1.5 cursor-pointer">
                  <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t)} className="mt-0.5" />
                  <span className={t.completed ? "text-muted-foreground line-through" : ""}>{t.title}</span>
                </label>
              ))}
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
            <CardHeader><CardTitle className="text-base">Respostas do briefing</CardTitle></CardHeader>
            <CardContent>
              {!client.briefing_submitted_at ? (
                <p className="text-sm text-muted-foreground">
                  Briefing ainda não preenchido. Envie o link ao cliente.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {Object.entries(b).map(([k, v]) => v && (
                    <div key={k} className="space-y-1">
                      <div className="text-xs uppercase text-muted-foreground tracking-wide">{k.replace(/_/g, " ")}</div>
                      <div>{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
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
