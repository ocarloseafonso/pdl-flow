import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Link } from "react-router-dom";
import type { Client, Phase, ClientTask } from "@/lib/types";
import { daysBetween, isOverdue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, GripVertical, Clock, AlertTriangle } from "lucide-react";

export function KanbanBoard({
  clients,
  phases,
  tasks,
  onMove,
}: {
  clients: Client[];
  phases: Phase[];
  tasks: ClientTask[];
  onMove: (clientId: string, phaseId: number) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const targetPhase = Number(e.over.id);
    onMove(String(e.active.id), targetPhase);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {phases.map((ph) => (
          <Column
            key={ph.id}
            phase={ph}
            clients={clients.filter((c) => c.current_phase_id === ph.id && c.status === "active")}
            tasks={tasks}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ phase, clients, tasks }: { phase: Phase; clients: Client[]; tasks: ClientTask[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: phase.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 rounded-lg border border-border bg-card flex flex-col",
        isOver && "ring-2 ring-primary",
      )}
    >
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="phase-dot" style={{ background: `hsl(var(--phase-${phase.id}))` }} />
          <span className="font-semibold text-sm">{phase.name}</span>
        </div>
        <Badge variant="secondary" className="rounded-full">{clients.length}</Badge>
      </div>
      <div className="p-2 space-y-2 flex-1 min-h-[200px] overflow-y-auto">
        {clients.map((c) => (
          <ClientCard key={c.id} client={c} phase={phase} tasks={tasks.filter((t) => t.client_id === c.id && t.phase_id === phase.id)} />
        ))}
        {clients.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">Sem clientes nesta fase</div>
        )}
      </div>
    </div>
  );
}

function ClientCard({ client, phase, tasks }: { client: Client; phase: Phase; tasks: ClientTask[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const days = daysBetween(client.phase_started_at);
  const status = isOverdue(client.phase_started_at, phase.expected_days);
  const pendingTasks = tasks.filter((t) => !t.completed).sort((a, b) => a.position - b.position);

  // Deadline calculation
  const deadlineDays = client.deadline_days || 30;
  const startDate = client.contract_start_date || client.created_at;
  const elapsedDays = daysBetween(startDate);
  const remainingDays = Math.max(0, deadlineDays - elapsedDays);
  const deadlinePct = Math.min(100, Math.round((elapsedDays / deadlineDays) * 100));
  const deadlineStatus = deadlinePct >= 100 ? "late" : deadlinePct >= 80 ? "warn" : "ok";

  const statusColor = {
    ok: "bg-success",
    warn: "bg-warning",
    late: "bg-destructive",
  }[status];

  const statusLabel = {
    ok: "No prazo",
    warn: "Atenção",
    late: "Atrasado",
  }[status];

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-background border border-border rounded-md p-3 select-none hover:border-primary/50 transition-colors",
        isDragging && "opacity-50",
      )}
    >
      {/* Handle de Arraste */}
      <div 
        {...listeners} 
        {...attributes} 
        className="absolute right-1 top-1 p-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Link to={`/clientes/${client.id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-1 pr-5">
          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {client.name}
          </span>
          <span className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", statusColor)} title={statusLabel} />
        </div>
        
        {client.company_name && (
          <div className="text-xs text-muted-foreground truncate mb-2">{client.company_name}</div>
        )}

        {/* Prazo contratual */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
          {deadlineStatus === "late" ? (
            <AlertTriangle className="h-3 w-3 text-destructive" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          <span className={cn(
            deadlineStatus === "late" && "text-destructive font-semibold",
            deadlineStatus === "warn" && "text-warning font-medium",
          )}>
            {remainingDays > 0 ? `${remainingDays}d restantes de ${deadlineDays}d` : `Prazo expirado (${deadlineDays}d)`}
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-medium uppercase tracking-wider">
            {pct}% Concluído
          </span>
          <span className="text-muted-foreground">{days}d na fase</span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-success" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>

        {/* Próximas tarefas pendentes */}
        {pendingTasks.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50 space-y-1.5">
            {pendingTasks.slice(0, 2).map((t) => (
              <div key={t.id} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <Circle className="h-2.5 w-2.5 mt-0.5 shrink-0 text-muted-foreground/50" />
                <span className="line-clamp-1">{t.title}</span>
              </div>
            ))}
            {pendingTasks.length > 2 && (
              <div className="text-[10px] text-muted-foreground pl-4">+{pendingTasks.length - 2} mais</div>
            )}
          </div>
        )}
        
        {pendingTasks.length === 0 && total > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center gap-1.5 text-[11px] text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span className="font-medium">Pronto para avançar</span>
          </div>
        )}
      </Link>
    </div>
  );
}
