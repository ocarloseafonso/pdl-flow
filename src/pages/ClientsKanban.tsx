import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Client, Phase, ClientTask } from "@/lib/types";
import { KanbanBoard } from "@/components/KanbanBoard";
import { NewClientDialog } from "@/components/NewClientDialog";
import { toast } from "sonner";

export default function ClientsKanban() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const [c, p, t] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("phases").select("*").order("position"),
      supabase
        .from("client_tasks")
        .select("*, clients!inner(id)")
    ]);
    setClients((c.data as Client[]) ?? []);
    setPhases((p.data as Phase[]) ?? []);
    setTasks(((t.data ?? []) as any[]).map(({ clients: _c, ...rest }) => rest));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  async function moveClient(clientId: string, targetPhase: number) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    if (targetPhase === client.current_phase_id) return;

    // Regra de ouro: só avança se a fase atual estiver 100% concluída
    if (targetPhase > client.current_phase_id) {
      const phaseTasks = tasks.filter((t) => t.client_id === clientId && t.phase_id === client.current_phase_id);
      const incomplete = phaseTasks.filter((t) => !t.completed).length;
      if (incomplete > 0) {
        toast.error(`Conclua as ${incomplete} tarefas restantes da fase atual antes de avançar.`);
        return;
      }
    }

    const { error } = await supabase
      .from("clients")
      .update({ current_phase_id: targetPhase, phase_started_at: new Date().toISOString() })
      .eq("id", clientId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setClients((cs) =>
      cs.map((c) =>
        c.id === clientId ? { ...c, current_phase_id: targetPhase, phase_started_at: new Date().toISOString() } : c,
      ),
    );
    toast.success("Cliente movido");
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões entre as fases. {clients.filter((c) => c.status === "active").length} ativos.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Carregando…</div>
      ) : (
        <KanbanBoard clients={clients} phases={phases} tasks={tasks} onMove={moveClient} />
      )}

      <NewClientDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}
