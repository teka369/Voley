import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  History,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
  Users,
  Volleyball,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/ui";
import type { ThemeMode } from "@/lib/domain";
import { bootstrapStore, useVm } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Inicio", icon: LayoutDashboard, end: true },
  { to: "/reservas", label: "Reservas", icon: CalendarDays },
  { to: "/companeros", label: "Compañeros", icon: Users },
  { to: "/documentos", label: "Documentos", icon: ShieldCheck },
  { to: "/plantillas", label: "Plantillas", icon: MessageSquare },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

const MOBILE = [
  { to: "/", label: "Inicio", icon: LayoutDashboard },
  { to: "/reservas", label: "Reservas", icon: CalendarDays },
  { to: "/companeros", label: "Equipo", icon: Users },
  { to: "/documentos", label: "Docs", icon: ShieldCheck },
  { to: "/mas", label: "Más", icon: Menu },
] as const;

function applyTheme(theme: ThemeMode) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

function activePath(path: string, to: string, end = false) {
  if (to === "/mas") return ["/mas", "/plantillas", "/historial", "/ajustes"].some((p) => path === p || path.startsWith(`${p}/`));
  if (end || to === "/") return path === "/";
  return path === to || path.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const theme = useVm((s) => s.prefs.theme);
  const hydrated = useVm((s) => s.hydrated);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    bootstrapStore();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    setDark(document.documentElement.classList.contains("dark"));
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      setDark(document.documentElement.classList.contains("dark"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, hydrated]);

  return (
    <ConfirmProvider>
      <div className="min-h-dvh bg-bg text-fg">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface md:flex">
          <div className="px-4 pt-5 pb-4">
            <Brand />
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => {
              const on = activePath(path, item.to, "end" in item ? item.end : false);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                    on ? "bg-primary-soft text-primary" : "text-fg",
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-4 py-4 text-xs text-muted">Las cédulas se quedan en este dispositivo.</p>
        </aside>
        <div className="md:pl-60">
          <header className="sticky top-0 z-20 flex items-center border-b border-line bg-bg px-4 py-3 md:hidden">
            <Brand compact />
          </header>
          <main className="pb-24 md:pb-8">{children}</main>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {MOBILE.map((item) => {
            const on = activePath(path, item.to, item.to === "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  on ? "text-primary" : "text-muted",
                )}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Toaster position="top-center" theme={dark ? "dark" : "light"} />
    </ConfirmProvider>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg">
        <Volleyball className="size-5" />
      </span>
      <span className="leading-none">
        <span className="font-display block text-2xl tracking-wide">VOLLEY</span>
        {!compact ? <span className="text-xs font-medium text-muted">Manager</span> : null}
      </span>
    </Link>
  );
}
