import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus, Users } from "lucide-react";
import { type ReactNode } from "react";
import { toast } from "sonner";
import { buttonClass, Card, DemoBadge, EmptyState, LoadingBlock, StatusBadge } from "@/components/ui";
import {
  assess,
  computeFinance,
  cop,
  cuando,
  greeting,
  horaAmPm,
  isHistory,
  isoDate,
  isUpcoming,
  RES_LABEL,
} from "@/lib/domain";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useHydrated();
  const people = useVm((s) => s.people);
  const reservations = useVm((s) => s.reservations);
  const organizer = useVm((s) => s.prefs.organizerName);
  const loadDemo = useVm((s) => s.loadDemo);
  if (!hydrated) return <LoadingBlock />;

  const today = isoDate(new Date());
  const upcoming = reservations
    .filter((r) => isUpcoming(r, today))
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const next = upcoming[0];
  const recent = reservations
    .filter((r) => isHistory(r, today))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const hasDemo = people.some((p) => p.isDemo) || reservations.some((r) => r.isDemo);
  const report = next ? assess(next, people) : null;
  const finance = next ? computeFinance(next) : null;
  const stale = reservations.filter((r) => r.date < today && r.status !== "finalizada" && r.status !== "cancelada");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <p className="text-sm text-muted">{greeting()}{organizer ? `, ${organizer}` : ""}</p>
      <h1 className="font-display text-4xl leading-none tracking-tight">Tu voleibol</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Reservas, cupos, documentos y plata del encuentro, sin perseguir cédulas por el chat.</p>

      {hasDemo ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          <p>Hay datos de prueba marcados. No son personas reales y se pueden borrar sin tocar lo demás.</p>
          <Link to="/ajustes" className="font-semibold">
            Administrar
          </Link>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/reservas/nueva" className={buttonClass()}>
          <Plus className="size-4" /> Nuevo encuentro
        </Link>
        <Link to="/companeros" className={buttonClass("secondary")}>
          <Users className="size-4" /> Compañeros
        </Link>
      </div>

      {!next ? (
        <div className="mt-5">
          <EmptyState
            icon={CalendarDays}
            title="Todavía no hay un encuentro próximo"
            body="Crea la reserva con escenario, hora y cuántos documentos piden. Luego marcas quién va."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/reservas/nueva" className={buttonClass()}>
                  Crear el primero
                </Link>
                <button
                  type="button"
                  className={buttonClass("secondary")}
                  onClick={() => {
                    const result = loadDemo();
                    if (!result.ok) toast.error(result.error);
                    else toast.success("Ejemplo cargado. Tiene la etiqueta Prueba.");
                  }}
                >
                  Cargar un ejemplo
                </button>
              </div>
            }
          />
        </div>
      ) : report && finance ? (
        <Card className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={next.status} label={RES_LABEL[next.status]} />
            {next.isDemo ? <DemoBadge /> : null}
            <span className="text-sm text-muted">{cuando(next.date, today)}</span>
          </div>
          <h2 className="mt-2 font-display text-4xl leading-none">{next.venue}</h2>
          <p className="mt-1 text-sm text-muted">
            {horaAmPm(next.startTime)} a {horaAmPm(next.endTime)}
            {next.address ? ` · ${next.address}` : ""}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Confirmados" value={String(report.confirmed + report.attended)} />
            <Stat label="Pendientes" value={String(report.pending)} />
            <Stat label="Cupos libres" value={String(Math.max(0, report.spotsLeft))} danger={report.overCapacity} />
            <Stat label="Documentos" value={`${report.collectedDocs}/${report.requiredDocs}`} danger={!report.docsReady} />
          </div>
          <div className="mt-4 grid gap-2">
            {report.overCapacity ? <Note danger>Superaste la capacidad: {report.occupying} de {next.capacity}.</Note> : null}
            {!report.docsReady ? <Note>Faltan {report.missingDocs} documentos para completar la reserva.</Note> : <Note>La reserva está lista en documentos.</Note>}
            {finance.pending > 0 ? <Note>Falta recoger {cop(finance.pending)} del aporte.</Note> : null}
            {report.duplicateDocIds.length ? <Note danger>Hay una identificación repetida en la lista.</Note> : null}
            {stale.length ? <Note>Tienes {stale.length} encuentro{stale.length === 1 ? "" : "s"} pasado{stale.length === 1 ? "" : "s"} sin finalizar.</Note> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/reservas/$id" params={{ id: next.id }} className={buttonClass()}>
              Abrir encuentro
            </Link>
            <Link to="/reservas/$id" params={{ id: next.id }} search={{ tab: "documentos" }} className={buttonClass("secondary")}>
              Copiar documentos
            </Link>
          </div>
        </Card>
      ) : null}

      {upcoming.length > 1 ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Próximas reservas</h2>
            <Link to="/reservas" className="text-sm font-medium text-primary">Ver todas</Link>
          </div>
          <div className="grid gap-2">
            {upcoming.slice(1, 4).map((r) => (
              <Link key={r.id} to="/reservas/$id" params={{ id: r.id }} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="block font-medium">{r.venue}</span>
                <span className="text-sm text-muted">{cuando(r.date, today)} · {horaAmPm(r.startTime)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length ? (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Encuentros anteriores</h2>
            <Link to="/historial" className="text-sm font-medium text-primary">Historial</Link>
          </div>
          <div className="grid gap-2">
            {recent.map((r) => (
              <Link key={r.id} to="/reservas/$id" params={{ id: r.id }} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span>
                  <span className="block font-medium">{r.venue}</span>
                  <span className="text-sm text-muted">{cuando(r.date, today)}</span>
                </span>
                <StatusBadge status={r.status} label={RES_LABEL[r.status]} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-display text-3xl leading-none tabular-nums ${danger ? "text-danger" : ""}`}>{value}</p>
    </div>
  );
}

function Note({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return <p className={`rounded-xl px-3 py-2 text-sm ${danger ? "bg-danger-soft text-danger" : "bg-surface-2"}`}>{children}</p>;
}
