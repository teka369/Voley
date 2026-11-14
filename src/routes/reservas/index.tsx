import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus } from "lucide-react";
import { useState } from "react";
import { buttonClass, DemoBadge, EmptyState, LoadingBlock, Page, SearchField, StatusBadge } from "@/components/ui";
import { assess, cuando, horaAmPm, isoDate, RES_LABEL, type ReservationStatus } from "@/lib/domain";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/reservas/")({ component: Reservas });

const FILTERS: { id: "proximas" | "todas" | ReservationStatus; label: string }[] = [
  { id: "proximas", label: "Próximas" },
  { id: "todas", label: "Todas" },
  { id: "borrador", label: "Borradores" },
  { id: "confirmada", label: "Confirmadas" },
  { id: "finalizada", label: "Finalizadas" },
  { id: "cancelada", label: "Canceladas" },
];

function Reservas() {
  const hydrated = useHydrated();
  const reservations = useVm((s) => s.reservations);
  const people = useVm((s) => s.people);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("proximas");
  const [q, setQ] = useState("");
  if (!hydrated) return <LoadingBlock />;
  const today = isoDate(new Date());
  const needle = q.trim().toLowerCase();
  const rows = reservations
    .filter((r) => {
      if (filter === "proximas") return r.date >= today && r.status !== "cancelada" && r.status !== "finalizada";
      if (filter === "todas") return true;
      return r.status === filter;
    })
    .filter((r) => !needle || `${r.venue} ${r.address} ${r.notes}`.toLowerCase().includes(needle))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  return (
    <Page
      title="Reservas"
      lede="Crea, duplica y cierra los encuentros sin volver a armar la lista desde cero."
      actions={
        <Link to="/reservas/nueva" className={buttonClass()}>
          <Plus className="size-4" /> Nueva
        </Link>
      }
    >
      <SearchField value={q} onChange={setQ} placeholder="Buscar escenario o dirección" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${filter === item.id ? "bg-primary text-primary-fg" : "bg-surface text-fg"}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {rows.length ? (
          rows.map((r) => {
            const report = assess(r, people);
            return (
              <Link key={r.id} to="/reservas/$id" params={{ id: r.id }} className="block rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} label={RES_LABEL[r.status]} />
                  {r.isDemo ? <DemoBadge /> : null}
                </div>
                <h2 className="mt-2 text-lg font-semibold">{r.venue}</h2>
                <p className="text-sm text-muted">
                  {cuando(r.date, today)} · {horaAmPm(r.startTime)} a {horaAmPm(r.endTime)}
                </p>
                <p className="mt-2 text-sm">
                  {report.occupying}/{r.capacity} en lista
                  {report.overCapacity ? " · capacidad superada" : ` · ${Math.max(0, report.spotsLeft)} cupos libres`}
                  {" · "}
                  {report.docsReady ? "documentos listos" : `faltan ${report.missingDocs} documentos`}
                </p>
              </Link>
            );
          })
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No hay reservas en este filtro"
            body="Prueba otro estado o crea un encuentro nuevo. Se guarda como borrador si todavía faltan datos."
            action={
              <Link to="/reservas/nueva" className={buttonClass()}>
                Nueva reserva
              </Link>
            }
          />
        )}
      </div>
    </Page>
  );
}
