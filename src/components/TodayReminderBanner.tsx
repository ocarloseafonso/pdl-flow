import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";

export function TodayReminderBanner() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_date", todayISO())
      .eq("done", false)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [user]);

  if (dismissed || count === 0) return null;

  return (
    <div className="bg-warning-soft border-b border-warning/30 px-6 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Bell className="h-4 w-4 text-warning" />
        <span>
          Você tem <strong>{count}</strong> {count === 1 ? "lembrete" : "lembretes"} para hoje
        </span>
        <Link to="/agenda" className="text-primary font-medium hover:underline ml-2">
          Abrir agenda
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
