import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { buttonClass, Card, DemoBadge, EmptyState, LoadingBlock, Page, StatusBadge } from "@/components/ui";
import { assess, cuando, fechaCorta, isoDate, isHistory, RES_LABEL } from "@/lib/domain";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/historial")({ component: Historial });

function Historial() {
  const hydrated = useHydrated();
  const reservations = useVm((s) => s.reservations);
  const people = useVm((s) => s.people);
  const duplicateReservation = useVm((s) => s.duplicateReservation);
  const navigate = useNavigate();
  const [Chart, setChart] = useState<ComponentType<{ data: { name: string; asistieron: number }[] }> | null>(null);

  useEffect(() => {
    void import("@/components/attendance-chart").then((mod) => setChart(() => mod.AttendanceChart));
  }, []);

  if (!hydrated) return <LoadingBlock />;
  const today = isoDate(new Date());
  const past = reservations.filter((r) => isHistory(r, today)).sort((a, b) => b.date.localeCompare(a.date));
  const closed = past.filter((r) => r.status === "finalizada");
  let went = 0;
  let called = 0;
  const byPerson = new Map<string, { name: string; went: number; called: number }>();
  for (const r of closed) {
    for (const p of r.participants) {
      const person = people.find((x) => x.id === p.personId);
      if (!person || p.status === "cancelado") continue;
      const row = byPerson.get(p.personId) ?? { name: person.fullName, went: 0, called: 0 };
      if (p.status === "asistio" || p.status === "no_asistio") {
        row.called += 1;
        called += 1;
        if (p.status === "asistio") {
          row.went += 1;
          went += 1;
        }
      }
      byPerson.set(p.personId, row);
    }
  }
  const ranking = [...byPerson.values()].sort((a, b) => b.went - a.went || b.called - a.called).slice(0, 6);
  const chartData = [...closed]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6)
    .map((r) => ({
      name: fechaCorta(r.date).split(" ").slice(0, 2).join(" "),
      asistieron: r.participants.filter((p) => p.status === "asistio").length,
    }));
  const rate = called ? Math.round((went / called) * 100) : 0;

  return (
    <Page title="Historial" lede="Encuentros anteriores, asistencia y una lista lista para repetir.">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-muted">Finalizados</p>
          <p className="font-display text-3xl tabular-nums">{closed.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Asistencia</p>
          <p className="font-display text-3xl tabular-nums">{rate}%</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">En el archivo</p>
          <p className="font-display text-3xl tabular-nums">{past.length}</p>
        </Card>
      </div>
      {chartData.length && Chart ? (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Quién asistió</h2>
          <Chart data={chartData} />
        </Card>
      ) : null}
      {ranking.length ? (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Los más constantes</h2>
          <ul className="grid gap-2">
            {ranking.map((row) => (
              <li key={row.name} className="flex items-center justify-between text-sm">
                <span>{row.name}</span>
                <span className="tabular-nums text-muted">{row.went}/{row.called}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {past.length ? (
          past.map((r) => {
            const report = assess(r, people);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} label={RES_LABEL[r.status]} />
                  {r.isDemo ? <DemoBadge /> : null}
                </div>
                <h2 className="mt-2 text-lg font-semibold">{r.venue}</h2>
                <p className="text-sm text-muted">
                  {cuando(r.date, today)} · {report.attended} asistieron · {report.noShow} no fueron
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/reservas/$id" params={{ id: r.id }} className={buttonClass("secondary")}>
                    Ver
                  </Link>
                  <button
                    type="button"
                    className={buttonClass()}
                    onClick={() => {
                      const result = duplicateReservation(r.id);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Lista recuperada en un encuentro nuevo. Sin pagos.");
                      void navigate({ to: "/reservas/$id", params: { id: result.id } });
                    }}
                  >
                    Repetir encuentro
                  </button>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={History} title="Aún no hay historial" body="Cuando finalices un encuentro, queda aquí con su asistencia para armar el siguiente." />
        )}
      </div>
    </Page>
  );
}
