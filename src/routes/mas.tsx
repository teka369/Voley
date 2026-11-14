import { createFileRoute, Link } from "@tanstack/react-router";
import { History, MessageSquare, Settings } from "lucide-react";
import { Page } from "@/components/ui";

export const Route = createFileRoute("/mas")({ component: Mas });

const LINKS = [
  { to: "/plantillas", label: "Plantillas", body: "Invitaciones, confirmaciones y listas listas para copiar.", icon: MessageSquare },
  { to: "/historial", label: "Historial", body: "Encuentros anteriores y asistencia para repetir la lista.", icon: History },
  { to: "/ajustes", label: "Ajustes", body: "Copia de seguridad, tema y datos de prueba.", icon: Settings },
] as const;

function Mas() {
  return (
    <Page title="Más" lede="Lo que no cabe en la barra de abajo.">
      <div className="grid gap-3">
        {LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
              <item.icon className="size-5" />
            </span>
            <span>
              <span className="block font-semibold">{item.label}</span>
              <span className="text-sm text-muted">{item.body}</span>
            </span>
          </Link>
        ))}
      </div>
    </Page>
  );
}
