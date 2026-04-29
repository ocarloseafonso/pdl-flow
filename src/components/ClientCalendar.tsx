import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { CalendarEvent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { todayISO, formatDate } from "@/lib/dates";

export function ClientCalendar({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", event_date: todayISO(), event_time: "" });

  async function load() {
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("client_id", clientId)
      .order("event_date");
    setEvents((data as CalendarEvent[]) ?? []);
  }
  useEffect(() => { load(); }, [clientId]);

  async function add() {
    if (!user || !form.title) return;
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      client_id: clientId,
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      type: "reminder",
    });
    if (error) return toast.error(error.message);
    setForm({ title: "", description: "", event_date: todayISO(), event_time: "" });
    setShow(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    load();
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Agenda do cliente</h3>
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>
            <Plus className="h-4 w-4" /> Novo lembrete
          </Button>
        </div>

        {show && (
          <div className="space-y-2 border border-border rounded-md p-3 bg-secondary/30">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição (opcional)" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Data</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Hora (opcional)</Label>
                <Input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={add}>Adicionar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShow(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lembrete para este cliente.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(e.event_date)}{e.event_time ? ` às ${e.event_time.slice(0, 5)}` : ""}
                    {e.description && ` · ${e.description}`}
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(e.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
