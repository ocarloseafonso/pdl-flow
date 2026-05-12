import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, KanbanSquare, Calendar, Settings2, LogOut, FileText, BookOpen, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { TodayReminderBanner } from "./TodayReminderBanner";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/clientes", label: "Clientes (Kanban)", icon: KanbanSquare },
  { to: "/agenda", label: "Agenda", icon: Calendar },
  { to: "/guia", label: "Guia de Execução", icon: BookOpen },
  { to: "/agentes", label: "Agentes IA", icon: BrainCircuit },
  { to: "/prompts", label: "Prompts & Templates", icon: FileText },
  { to: "/config", label: "Configurações", icon: Settings2 },
];

export function AppLayout() {
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav("/login", { replace: true });
  }, [loading, user, nav]);

  if (loading || !user) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center gap-3">
          <img src="/logo-ceafonso.png" alt="C.E. Afonso" className="h-8 w-8 rounded-md object-contain" />
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">C.E. Afonso</div>
            <div className="text-[10px] text-muted-foreground">Soluções Digitais</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            <span className="text-[9px] text-muted-foreground/50 font-mono">v1.0</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={async () => {
              await supabase.auth.signOut();
              nav("/login");
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <TodayReminderBanner />
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
