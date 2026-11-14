import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DocPanel } from "@/components/doc-panel";
import { PersonaDialog } from "@/components/persona-dialog";
import { ReservaForm } from "@/components/reserva-form";
import { Button, Card, DemoBadge, DocText, MoneyField, SelectInput, StatusBadge, TextInput, useConfirm } from "@/components/ui";
import {
  ATTENDANCE_LABEL,
  RES_LABEL,
  assess,
  computeFinance,
  cop,
  cuando,
  horaAmPm,
  includesLoose,
  inputFromReservation,
  peopleMap,
  positionLabel,
  rosterDocs,
  type AttendanceStatus,
  type Reservation,
} from "@/lib/domain";
import { copyText } from "@/lib/exporters";
import { useVm } from "@/lib/store";

const TABS = [
  { id: "equipo", label: "Equipo" },
  { id: "pagos", label: "Pagos" },
  { id: "documentos", label: "Documentos" },
  { id: "cambios", label: "Cambios" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReservaView({ id, initialTab }: { id: string; initialTab?: TabId }) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const res = useVm((s) => s.reservations.find((r) => r.id === id));
  const people = useVm((s) => s.people);
  const updateReservation = useVm((s) => s.updateReservation);
  const setReservationStatus = useVm((s) => s.setReservationStatus);
  const duplicateReservation = useVm((s) => s.duplicateReservation);
  const addParticipants = useVm((s) => s.addParticipants);
  const removeParticipant = useVm((s) => s.removeParticipant);
  const setParticipantStatus = useVm((s) => s.setParticipantStatus);
  const setParticipantPaid = useVm((s) => s.setParticipantPaid);
  const addExpense = useVm((s) => s.addExpense);
  const removeExpense = useVm((s) => s.removeExpense);
  const [tab, setTab] = useState<TabId>(initialTab ?? "equipo");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [personOpen, setPersonOpen] = useState(false);
  const [expenseLabel, setExpenseLabel] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const report = useMemo(() => (res ? assess(res, people) : null), [res, people]);
  const finance = useMemo(() => (res ? computeFinance(res) : null), [res]);
  const map = useMemo(() => peopleMap(people), [people]);

  if (!res || !report || !finance) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <h1 className="font-display text-4xl">No está esta reserva</h1>
        <Link to="/reservas" className="mt-4 inline-flex min-h-11 items-center text-primary">
          Volver a reservas
        </Link>
      </div>
    );
  }

  const available = people.filter(
    (p) => !p.archived && !res.participants.some((x) => x.personId === p.id) && includesLoose(`${p.fullName} ${p.documentId} ${p.phone}`, query),
  );

  const addPicked = async () => {
    const ids = picked.filter((pid) => !res.participants.some((p) => p.personId === pid));
    if (!ids.length) return;
    const nextCount = report.occupying + ids.length;
    if (nextCount > res.capacity) {
      const ok = await confirm({
        title: "Vas a superar la capacidad",
        body: `Quedarían ${nextCount} personas en una cancha de ${res.capacity} cupos.`,
        confirmLabel: "Agregar de todas formas",
        danger: true,
      });
      if (!ok) return;
    }
    const result = addParticipants(res.id, ids);
    setPicked([]);
    if (result.added) toast.success(result.added === 1 ? "Compañero agregado" : `${result.added} compañeros agregados`);
  };

  const changeStatus = async (status: Reservation["status"]) => {
    if (status === "cancelada") {
      const ok = await confirm({
        title: "¿Cancelar esta reserva?",
        body: "El encuentro deja de contar como próximo. La lista se conserva.",
        confirmLabel: "Cancelar reserva",
        danger: true,
      });
      if (!ok) return;
    }
    if (status === "finalizada") {
      const ok = await confirm({
        title: "¿Finalizar el encuentro?",
        body: "Pasará al historial. Puedes reabrirlo si te equivocaste.",
        confirmLabel: "Finalizar",
      });
      if (!ok) return;
    }
    setReservationStatus(res.id, status);
    toast.success("Estado actualizado");
  };

  const duplicate = () => {
    const result = duplicateReservation(res.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Encuentro duplicado. Los pagos no se copiaron.");
    void navigate({ to: "/reservas/$id", params: { id: result.id } });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{cuando(res.date)} · {horaAmPm(res.startTime)} a {horaAmPm(res.endTime)}</p>
          <h1 className="font-display text-4xl leading-none tracking-tight">{res.venue}</h1>
          <p className="mt-1 text-sm text-muted">{res.address || "Sin dirección"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={res.status} label={RES_LABEL[res.status]} />
            {res.isDemo ? <DemoBadge /> : null}
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {res.status === "borrador" ? <Button onClick={() => void changeStatus("confirmada")}>Confirmar reserva</Button> : null}
        {res.status === "confirmada" || res.status === "borrador" ? (
          <Button variant="secondary" onClick={() => void changeStatus("finalizada")}>Finalizar</Button>
        ) : null}
        {res.status === "cancelada" || res.status === "finalizada" ? (
          <Button variant="secondary" onClick={() => void changeStatus("confirmada")}>Reabrir</Button>
        ) : null}
        <Button variant="secondary" onClick={() => setEditing((v) => !v)}>{editing ? "Cerrar edición" : "Editar"}</Button>
        <Button variant="secondary" onClick={duplicate}>Duplicar</Button>
        <Link to="/plantillas" search={{ encuentro: res.id }} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold">
          Mensaje
        </Link>
        {res.status !== "cancelada" ? (
          <Button variant="ghost" onClick={() => void changeStatus("cancelada")}>Cancelar</Button>
        ) : null}
      </div>

      {editing ? (
        <ReservaForm
          initial={inputFromReservation(res)}
          submitLabel="Guardar reserva"
          onCancel={() => setEditing(false)}
          onSubmit={(input, force) => {
            const result = updateReservation(res.id, input, { force });
            if (result.ok) {
              toast.success("Reserva actualizada");
              setEditing(false);
            }
            return result;
          }}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="En lista" value={`${report.occupying}/${res.capacity}`} warn={report.overCapacity} />
            <Metric label="Confirmados" value={String(report.confirmed + report.attended)} />
            <Metric label="Pendientes" value={String(report.pending)} />
            <Metric
              label="Documentos"
              value={`${report.collectedDocs}/${report.requiredDocs}`}
              warn={!report.docsReady}
              ok={report.docsReady}
            />
          </div>
          {report.overCapacity ? (
            <Banner tone="danger">Superaste la capacidad: {report.occupying} de {res.capacity} cupos.</Banner>
          ) : null}
          {!report.docsReady ? (
            <Banner>Faltan {report.missingDocs} documentos para los {report.requiredDocs} exigidos.</Banner>
          ) : (
            <Banner tone="ok">Listo documentalmente: {report.collectedDocs} de {report.requiredDocs}.</Banner>
          )}
          {report.duplicateDocIds.length ? (
            <Banner tone="danger">Hay una identificación repetida en la lista. Revisa el equipo antes de enviarla.</Banner>
          ) : null}

          <div className="my-4 flex gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${tab === item.id ? "bg-surface" : "text-muted"}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "equipo" ? (
            <div className="grid gap-3">
              <Card>
                <h2 className="mb-2 font-semibold">Agregar del directorio</h2>
                <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o cédula" />
                <div className="mt-3 max-h-56 space-y-2 overflow-auto">
                  {available.length ? (
                    available.map((p) => (
                      <label key={p.id} className="flex min-h-11 items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="size-5"
                          checked={picked.includes(p.id)}
                          onChange={() => setPicked((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{p.fullName}</span>
                          <span className="text-muted">{positionLabel(p.position)}</span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No hay más compañeros con ese filtro.</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void addPicked()} disabled={!picked.length}>
                    Agregar seleccionados
                  </Button>
                  <Button variant="secondary" onClick={() => setPersonOpen(true)}>
                    Nuevo compañero
                  </Button>
                </div>
              </Card>
              {res.participants.length ? (
                res.participants.map((p) => {
                  const person = map.get(p.personId);
                  return (
                    <Card key={p.personId}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{person?.fullName ?? "Persona eliminada"}</p>
                          <p className="text-sm text-muted">{person ? positionLabel(person.position) : ""}</p>
                          {person ? <DocText value={person.documentId} /> : null}
                        </div>
                        <div className="flex gap-2">
                          {person ? (
                            <Button
                              variant="ghost"
                              onClick={() => void copyText(person.documentId).then((ok) => (ok ? toast.success("Identificación copiada") : toast.error("No se pudo copiar")))}
                            >
                              Copiar
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const run = async () => {
                                if (p.paid > 0) {
                                  const ok = await confirm({
                                    title: "Esta persona tiene un pago",
                                    body: "Si la quitas, el abono sale de la lista. El historial del encuentro conserva el cambio.",
                                    confirmLabel: "Quitar",
                                    danger: true,
                                  });
                                  if (!ok) return;
                                }
                                removeParticipant(res.id, p.personId);
                              };
                              void run();
                            }}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <SelectInput
                          aria-label={`Estado de ${person?.fullName ?? "participante"}`}
                          value={p.status}
                          onChange={(e) => setParticipantStatus(res.id, p.personId, e.target.value as AttendanceStatus)}
                        >
                          {(Object.keys(ATTENDANCE_LABEL) as AttendanceStatus[]).map((s) => (
                            <option key={s} value={s}>
                              {ATTENDANCE_LABEL[s]}
                            </option>
                          ))}
                        </SelectInput>
                        {p.status === "pendiente" || p.status === "invitado" ? (
                          <Button onClick={() => setParticipantStatus(res.id, p.personId, "confirmado")}>Confirmar</Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })
              ) : (
                <p className="text-sm text-muted">Todavía no hay nadie en este encuentro.</p>
              )}
            </div>
          ) : null}

          {tab === "pagos" ? (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Cancha" value={cop(finance.courtCost)} />
                <Metric label="Recaudado" value={cop(finance.collected)} />
                <Metric label="Por cobrar" value={cop(finance.pending)} warn={finance.pending > 0} />
                <Metric
                  label="Balance"
                  value={cop(finance.balance)}
                  warn={finance.balance < 0}
                  ok={finance.balance >= 0}
                  hint={finance.balance >= 0 ? "Sobra" : "Falta plata"}
                />
              </div>
              <p className="text-sm text-muted">
                El aporte se reparte entre confirmados, pendientes y quienes asistieron. Invitados y cancelados no entran hasta que cambien de estado. Los pagos no se copian al duplicar.
              </p>
              {res.participants.map((p) => {
                const person = map.get(p.personId);
                const line = finance.shares.find((s) => s.personId === p.personId);
                return (
                  <Card key={p.personId}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{person?.fullName ?? "Persona eliminada"}</p>
                        <p className="text-sm text-muted">
                          {ATTENDANCE_LABEL[p.status]}
                          {line && line.share > 0 ? ` · Aporte ${cop(line.share)}` : " · No aporta"}
                          {line && line.owes > 0 ? ` · Debe ${cop(line.owes)}` : line && line.share > 0 ? " · Al día" : ""}
                        </p>
                      </div>
                      {line && line.share > 0 ? (
                        <Button variant="secondary" onClick={() => setParticipantPaid(res.id, p.personId, line.share)}>
                          Pagó
                        </Button>
                      ) : null}
                    </div>
                    <MoneyField
                      label={`Pago de ${person?.fullName ?? "participante"}`}
                      value={p.paid}
                      onCommit={(n) => setParticipantPaid(res.id, p.personId, n)}
                    />
                  </Card>
                );
              })}
              <Card>
                <h2 className="mb-2 font-semibold">Otro gasto</h2>
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <TextInput value={expenseLabel} onChange={(e) => setExpenseLabel(e.target.value)} placeholder="Agua, balón, transporte" />
                  <TextInput inputMode="numeric" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value.replace(/[^\d]/g, ""))} placeholder="Valor" />
                  <Button
                    onClick={() => {
                      const result = addExpense(res.id, expenseLabel, Number(expenseAmount || 0));
                      if (!result.ok) toast.error(result.error);
                      else {
                        setExpenseLabel("");
                        setExpenseAmount("");
                        toast.success("Gasto registrado");
                      }
                    }}
                  >
                    Agregar
                  </Button>
                </div>
                <ul className="mt-3 space-y-2">
                  {res.expenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                      <span>{e.label} · {cop(e.amount)}</span>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          void confirm({ title: "¿Quitar este gasto?", body: e.label, confirmLabel: "Quitar", danger: true }).then((ok) => {
                            if (ok) removeExpense(res.id, e.id);
                          });
                        }}
                      >
                        Quitar
                      </Button>
                    </li>
                  ))}
                  {finance.expensesTotal > 0 ? <li className="text-sm text-muted">Gastos extra: {cop(finance.expensesTotal)}</li> : null}
                </ul>
              </Card>
            </div>
          ) : null}

          {tab === "documentos" ? (
            <div className="grid gap-3">
              {report.peopleMissingDoc.length ? (
                <Banner>
                  Sin identificación válida:{" "}
                  {report.peopleMissingDoc.map((pid) => map.get(pid)?.fullName ?? "alguien").join(", ")}.
                </Banner>
              ) : null}
              <DocPanel rows={rosterDocs(res, people)} filename={`documentos-${res.date}`} selectAll />
            </div>
          ) : null}

          {tab === "cambios" ? (
            <ol className="grid gap-2">
              {[...res.changelog].reverse().map((c) => (
                <li key={c.id} className="rounded-xl border border-line bg-surface px-3 py-3 text-sm">
                  <p>{c.message}</p>
                  <p className="text-xs text-muted">{new Date(c.at).toLocaleString("es-CO")}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
      <PersonaDialog
        open={personOpen}
        onOpenChange={setPersonOpen}
        onSaved={(personId) => {
          const nextCount = report.occupying + 1;
          const run = async () => {
            if (nextCount > res.capacity) {
              const ok = await confirm({
                title: "Vas a superar la capacidad",
                body: `Quedarían ${nextCount} personas en una cancha de ${res.capacity} cupos.`,
                confirmLabel: "Agregar de todas formas",
                danger: true,
              });
              if (!ok) return;
            }
            addParticipants(res.id, [personId]);
            toast.success("Compañero creado y agregado");
          };
          void run();
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  warn,
  ok,
  hint,
}: {
  label: string;
  value: string;
  warn?: boolean;
  ok?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-display text-3xl leading-none tabular-nums ${warn ? "text-danger" : ok ? "text-primary" : ""}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function Banner({ children, tone = "warn" }: { children: ReactNode; tone?: "warn" | "danger" | "ok" }) {
  const cls = tone === "danger" ? "bg-danger-soft text-danger" : tone === "ok" ? "bg-primary-soft text-primary" : "bg-accent-soft text-fg";
  return <p className={`mb-2 rounded-xl px-3 py-3 text-sm font-medium ${cls}`}>{children}</p>;
}
