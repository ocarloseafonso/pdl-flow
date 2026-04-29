import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayISO, daysBetween, isOverdue } from "@/lib/dates";
import type { Client, Phase } from "@/lib/types";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [openTasks, setOpenTasks] = useState<
    { id: string; title: string; client_id: string; client_name: string; phase_id: number }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [c, p, ev, tasks] = await Promise.all([
        supabase.from("clients").select("*"),
        supabase.from("phases").select("*").order("position"),
        supabase
          .from("calendar_events")
          .select("id", { count: "exact", head: true })
          .eq("event_date", todayISO())
          .eq("done", false),
        supabase
          .from("client_tasks")
          .select("id, title, client_id, phase_id, clients!inner(name, current_phase_id)")
          .eq("completed", false)
          .limit(100),
      ]);
      setClients((c.data as Client[]) ?? []);
      setPhases((p.data as Phase[]) ?? []);
      setTodayCount(ev.count ?? 0);
      setOpenTasks(
        ((tasks.data ?? []) as any[])
          .filter((t) => t.phase_id === t.clients.current_phase_id)
          .map((t) => ({
            id: t.id,
            title: t.title,
            client_id: t.client_id,
            client_name: t.clients.name,
            phase_id: t.phase_id,
          })),
      );
    })();
  }, [user]);

  const active = clients.filter((c) => c.status === "active");
  const onboarding = active.filter((c) => c.current_phase_id === 1).length;
  const late = active.filter((c) => {
    const ph = phases.find((p) => p.id === c.current_phase_id);
    return ph && isOverdue(c.phase_started_at, ph.expected_days) === "late";
  }).length;

  // Delivered this month (phase 7 = Entrega)
  const delivered = active.filter((c) => c.current_phase_id >= 7).length;
  
  // Deadline alerts
  const deadlineAlerts = active.filter((c) => {
    const deadlineDays = c.deadline_days || 30;
    const startDate = c.contract_start_date || c.created_at;
    const elapsed = daysBetween(startDate);
    return elapsed / deadlineDays >= 0.8;
  }).length;

  // Revenue calculations
  const monthlyRevenue = active
    .filter((c) => c.contract_type === "monthly" && c.contract_value)
    .reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const oneTimeRevenue = active
    .filter((c) => c.contract_type === "one_time" && c.contract_value)
    .reduce((sum, c) => sum + (c.contract_value || 0), 0);
  const totalRevenue = monthlyRevenue + oneTimeRevenue;

  // Group tasks by client
  const tasksByClient: Record<string, { name: string; id: string; tasks: typeof openTasks }> = {};
  openTasks.forEach((t) => {
    if (!tasksByClient[t.client_id]) {
      tasksByClient[t.client_id] = { name: t.client_name, id: t.client_id, tasks: [] };
    }
    tasksByClient[t.client_id].tasks.push(t);
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação hoje.</p>
      </div>

      {/* Row 1: Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Clientes ativos" value={active.length} icon={<Users className="h-4 w-4" />} />
        <Stat label="Em onboarding" value={onboarding} icon={<Clock className="h-4 w-4" />} />
        <Stat label="Projetos entregues" value={delivered} icon={<CheckCircle2 className="h-4 w-4 text-success" />} />
        <Stat label="Prazos críticos" value={deadlineAlerts} icon={<AlertTriangle className="h-4 w-4" />} variant={deadlineAlerts > 0 ? "warn" : "ok"} />
        <Stat label="Lembretes hoje" value={todayCount} icon={<Clock className="h-4 w-4" />} />
      </div>

      {/* Row 2: Revenue */}
      {totalRevenue > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Receita mensal recorrente
              </div>
              <div className="text-2xl font-bold">R$ {monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground mt-1">{active.filter(c => c.contract_type === "monthly").length} clientes mensais</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Projetos (pagamento único)
              </div>
              <div className="text-2xl font-bold">R$ {oneTimeRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground mt-1">{active.filter(c => c.contract_type === "one_time").length} projetos avulsos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                LTV estimado (12 meses)
              </div>
              <div className="text-2xl font-bold">R$ {(monthlyRevenue * 12 + oneTimeRevenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-muted-foreground mt-1">Receita anual projetada</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending tasks grouped by client */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tarefas pendentes por cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(tasksByClient).length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo em dia 🎉</p>
            ) : (
              <div className="space-y-4">
                {Object.values(tasksByClient).map((group) => (
                  <div key={group.id}>
                    <Link to={`/clientes/${group.id}`} className="font-semibold text-sm hover:text-primary transition-colors flex items-center gap-2 mb-1.5">
                      {group.name}
                      <Badge variant="outline" className="text-[10px]">{group.tasks.length} pendentes</Badge>
                    </Link>
                    <ul className="space-y-1 pl-4 border-l-2 border-border">
                      {group.tasks.slice(0, 3).map((t) => (
                        <li key={t.id} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                          <span className="truncate">{t.title}</span>
                          <Badge variant="secondary" className="text-[9px] shrink-0">F{t.phase_id}</Badge>
                        </li>
                      ))}
                      {group.tasks.length > 3 && (
                        <li className="text-xs text-muted-foreground pl-3.5">+{group.tasks.length - 3} mais</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por fase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {phases.map((ph) => {
              const n = active.filter((c) => c.current_phase_id === ph.id).length;
              return (
                <div key={ph.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="phase-dot"
                      style={{ background: `hsl(var(--phase-${ph.id}))` }}
                    />
                    {ph.name}
                  </span>
                  <span className="font-medium">{n}</span>
                </div>
              );
            })}
            <div className="pt-3 border-t mt-2 text-xs text-muted-foreground">
              Setup completo médio: ~3 a 4 semanas por cliente
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  icon,
  variant = "ok",
}: { label: string; value: number; hint?: string; icon?: React.ReactNode; variant?: "ok" | "warn" }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`text-3xl font-bold mt-1 ${variant === "warn" ? "text-warning" : ""}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
