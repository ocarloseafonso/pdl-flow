import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { CalendarEvent, Holiday } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { todayISO } from "@/lib/dates";
import { getHolidays } from "@/lib/holidays";

type View = "month" | "week" | "day" | "year";

export default function Agenda() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<{ id?: string; title: string; description: string; event_date: string; event_time: string }>({ title: "", description: "", event_date: todayISO(), event_time: "" });

  async function load() {
    if (!user) return;
    const [{ data }, hol] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("user_id", user.id),
      getHolidays(),
    ]);
    setEvents((data as CalendarEvent[]) ?? []);
    setHolidays(hol);
  }
  useEffect(() => { load(); }, [user]);

  async function add() {
    if (!user || !form.title) return;
    
    if (form.id) {
      const { error } = await supabase.from("calendar_events").update({
        title: form.title,
        description: form.description || null,
        event_date: form.event_date,
        event_time: form.event_time || null,
      }).eq("id", form.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: form.title,
        description: form.description || null,
        event_date: form.event_date,
        event_time: form.event_time || null,
        type: "reminder",
      });
      if (error) return toast.error(error.message);
    }
    
    setForm({ title: "", description: "", event_date: todayISO(), event_time: "" });
    setShow(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from("calendar_events").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Lembretes, compromissos e feriados.</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex bg-secondary rounded-md p-0.5">
            {(["day", "week", "month", "year"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-xs rounded ${view === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : v === "month" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Hoje</Button>
          <Button size="sm" onClick={() => setShow(true)}>
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      <Navigator cursor={cursor} setCursor={setCursor} view={view} />

      <CalendarView view={view} cursor={cursor} events={events} holidays={holidays} onRemove={remove} onEdit={(e) => {
        setForm({ id: e.id, title: e.title, description: e.description || "", event_date: e.event_date, event_time: e.event_time || "" });
        setShow(true);
      }} />

      {show && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={() => { setShow(false); setForm({ title: "", description: "", event_date: todayISO(), event_time: "" }); }}>
          <Card className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold">{form.id ? "Editar lembrete" : "Novo lembrete"}</h3>
              <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Descrição" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Hora</Label>
                  <Input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                {form.id ? (
                  <Button variant="destructive" size="icon" onClick={() => { remove(form.id!); setShow(false); setForm({ title: "", description: "", event_date: todayISO(), event_time: "" }); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : <div />}
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setShow(false); setForm({ title: "", description: "", event_date: todayISO(), event_time: "" }); }}>Cancelar</Button>
                  <Button onClick={add}>{form.id ? "Salvar" : "Adicionar"}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Navigator({ cursor, setCursor, view }: { cursor: Date; setCursor: (d: Date) => void; view: View }) {
  function shift(dir: 1 | -1) {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCursor(d);
  }
  const label = view === "year"
    ? cursor.getFullYear().toString()
    : cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return (
    <div className="flex items-center gap-3">
      <Button size="icon" variant="ghost" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
      <div className="font-semibold capitalize text-lg">{label}</div>
      <Button size="icon" variant="ghost" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
    </div>
  );
}

function CalendarView({
  view, cursor, events, holidays, onRemove, onEdit
}: { view: View; cursor: Date; events: CalendarEvent[]; holidays: Holiday[]; onRemove: (id: string) => void; onEdit: (e: CalendarEvent) => void }) {
  if (view === "month") return <MonthView cursor={cursor} events={events} holidays={holidays} onRemove={onRemove} onEdit={onEdit} />;
  if (view === "week") return <ListView range={getWeekRange(cursor)} events={events} holidays={holidays} onRemove={onRemove} onEdit={onEdit} />;
  if (view === "day") {
    const d = cursor.toISOString().slice(0, 10);
    return <ListView range={[d, d]} events={events} holidays={holidays} onRemove={onRemove} onEdit={onEdit} />;
  }
  return <YearView cursor={cursor} events={events} holidays={holidays} />;
}

function getWeekRange(d: Date): [string, string] {
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

function MonthView({ cursor, events, holidays, onRemove, onEdit }: any) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1).toISOString().slice(0, 10)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const today = todayISO();
  return (
    <Card>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 gap-1 text-xs">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
            <div key={d} className="p-2 text-center font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((iso, i) => {
            if (!iso) return <div key={i} />;
            const dayEvents = events.filter((e: CalendarEvent) => e.event_date === iso);
            const holiday = holidays.find((h) => h.date === iso);
            const isToday = iso === today;
            return (
              <div key={iso} className={`min-h-[80px] border rounded-md p-1 ${isToday ? "border-primary bg-primary-soft" : "border-border"} ${holiday ? "bg-warning-soft/40" : ""}`}>
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{Number(iso.slice(8))}</span>
                </div>
                {holiday && <div className="text-[10px] text-warning truncate">🏖 {holiday.name}</div>}
                {dayEvents.slice(0, 3).map((e: CalendarEvent) => (
                  <div key={e.id} onClick={() => onEdit(e)} className="text-[10px] truncate bg-primary text-primary-foreground rounded px-1 mt-0.5 cursor-pointer hover:bg-primary/80 transition-colors">
                    {e.event_time ? `${e.event_time.slice(0, 5)} ` : ""}{e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ListView({ range, events, holidays, onRemove, onEdit }: { range: [string, string]; events: CalendarEvent[]; holidays: Holiday[]; onRemove: (id: string) => void; onEdit: (e: CalendarEvent) => void }) {
  const filtered = events.filter((e) => e.event_date >= range[0] && e.event_date <= range[1]);
  const hols = holidays.filter((h) => h.date >= range[0] && h.date <= range[1]);
  return (
    <Card>
      <CardContent className="pt-6 space-y-2">
        {hols.map((h) => (
          <div key={h.id} className="flex items-center gap-2 text-sm bg-warning-soft p-2 rounded">
            <span>🏖</span><strong>{h.name}</strong>
            <span className="text-muted-foreground ml-auto text-xs">{new Date(h.date).toLocaleDateString("pt-BR")}</span>
          </div>
        ))}
        {filtered.length === 0 && hols.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum evento neste período.</p>
        )}
        {filtered.map((e) => (
          <div key={e.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 group">
            <div className="flex-1 cursor-pointer hover:bg-accent/30 p-1 -ml-1 rounded transition-colors" onClick={() => onEdit(e)}>
              <div className="font-medium text-sm">{e.title}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(e.event_date).toLocaleDateString("pt-BR")}
                {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                {e.description && ` · ${e.description}`}
              </div>
            </div>
            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => onRemove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function YearView({ cursor, events, holidays }: any) {
  const year = cursor.getFullYear();
  const months = Array.from({ length: 12 }, (_, m) => m);
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {months.map((m) => {
        const evCount = events.filter((e: CalendarEvent) => e.event_date.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`)).length;
        const holCount = holidays.filter((h: Holiday) => h.date.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`)).length;
        return (
          <Card key={m}>
            <CardContent className="pt-4">
              <div className="font-semibold capitalize">
                {new Date(year, m, 1).toLocaleDateString("pt-BR", { month: "long" })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {evCount} eventos · {holCount} feriados
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
