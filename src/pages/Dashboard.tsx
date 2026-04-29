import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayISO, daysBetween, isOverdue } from "@/lib/dates";
import type { Client, Phase } from "@/lib/types";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const CAPACITY = 10;

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
          .limit(50),
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
  const ready = active.filter((c) => c.current_phase_id === 7).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua operação hoje.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Clientes ativos" value={active.length} hint={`${active.length} / ${CAPACITY} da capacidade`} />
        <Stat label="Em onboarding" value={onboarding} />
        <Stat label="Atrasados" value={late} variant={late > 0 ? "warn" : "ok"} />
        <Stat label="Lembretes hoje" value={todayCount} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Tarefas pendentes da fase atual</CardTitle>
          </CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tudo em dia 🎉</p>
            ) : (
              <ul className="space-y-2">
                {openTasks.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm border-b border-border pb-2 last:border-0">
                    <Link to={`/clientes/${t.client_id}`} className="hover:underline truncate">
                      <span className="font-medium">{t.client_name}</span>
                      <span className="text-muted-foreground"> · {t.title}</span>
                    </Link>
                    <Badge variant="outline" className="shrink-0">
                      Fase {t.phase_id}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

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
  variant = "ok",
}: { label: string; value: number; hint?: string; variant?: "ok" | "warn" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${variant === "warn" ? "text-warning" : ""}`}>{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}
