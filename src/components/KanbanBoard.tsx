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
          <Card key={c.id} client={c} phase={phase} tasks={tasks.filter((t) => t.client_id === c.id && t.phase_id === phase.id)} />
        ))}
        {clients.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">Sem clientes nesta fase</div>
        )}
      </div>
    </div>
  );
}

function Card({ client, phase, tasks }: { client: Client; phase: Phase; tasks: ClientTask[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: client.id });
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const days = daysBetween(client.phase_started_at);
  const status = isOverdue(client.phase_started_at, phase.expected_days);

  const statusColor = {
    ok: "bg-success",
    warn: "bg-warning",
    late: "bg-destructive",
  }[status];

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "bg-background border border-border rounded-md p-3 cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Link
          to={`/clientes/${client.id}`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-medium text-sm hover:underline truncate"
        >
          {client.name}
        </Link>
        <span className={cn("h-2 w-2 rounded-full shrink-0 mt-1.5", statusColor)} title={status} />
      </div>
      {client.company_name && (
        <div className="text-xs text-muted-foreground truncate">{client.company_name}</div>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {done}/{total} tarefas
        </span>
        <span className="text-muted-foreground">{days}d nesta fase</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
