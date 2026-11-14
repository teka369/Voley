import { useState } from "react";
import { Button, Card, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import {
  RES_LABEL,
  cop,
  parseMoney,
  type ReservationInput,
  type ReservationStatus,
  validateReservation,
} from "@/lib/domain";

const PRESETS = [80000, 100000, 120000, 150000];

export function ReservaForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ReservationInput;
  submitLabel: string;
  onSubmit: (input: ReservationInput, force: boolean) => { ok: boolean; error?: string; collision?: boolean };
  onCancel?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [docsFollow, setDocsFollow] = useState(initial.requiredDocuments === initial.capacity);
  const [errors, setErrors] = useState<Partial<Record<keyof ReservationInput, string>>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [collision, setCollision] = useState(false);
  const [more, setMore] = useState(Boolean(initial.notes || initial.requirements || initial.address));

  const set = (patch: Partial<ReservationInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setCollision(false);
  };

  const submit = (force: boolean) => {
    const checked = validateReservation(form);
    setErrors(checked.errors);
    setWarnings(checked.warnings);
    if (Object.keys(checked.errors).length) return;
    const result = onSubmit(form, force);
    if (!result.ok && result.collision) setCollision(true);
  };

  return (
    <Card>
      <div className="grid gap-3">
        <Field label="Escenario" error={errors.venue}>
          <TextInput value={form.venue} onChange={(e) => set({ venue: e.target.value })} placeholder="Cancha cubierta" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Fecha" error={errors.date}>
            <TextInput type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
          <Field label="Inicio" error={errors.startTime}>
            <TextInput type="time" value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} />
          </Field>
          <Field label="Fin" error={errors.endTime}>
            <TextInput type="time" value={form.endTime} onChange={(e) => set({ endTime: e.target.value })} />
          </Field>
        </div>
        <Field label="Costo de la cancha" error={errors.courtCost}>
          <TextInput
            inputMode="numeric"
            value={form.courtCost ? String(form.courtCost) : ""}
            onChange={(e) => set({ courtCost: parseMoney(e.target.value) })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm font-medium"
              onClick={() => set({ courtCost: n })}
            >
              {cop(n)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cupos" error={errors.capacity}>
            <TextInput
              inputMode="numeric"
              value={String(form.capacity)}
              onChange={(e) => {
                const capacity = Math.round(parseMoney(e.target.value));
                set({ capacity, requiredDocuments: docsFollow ? capacity : form.requiredDocuments });
              }}
            />
          </Field>
          <Field label="Documentos exigidos" error={errors.requiredDocuments} hint="Los que pide el escenario">
            <TextInput
              inputMode="numeric"
              value={String(form.requiredDocuments)}
              onChange={(e) => {
                setDocsFollow(false);
                set({ requiredDocuments: Math.round(parseMoney(e.target.value)) });
              }}
            />
          </Field>
        </div>
        <button type="button" className="min-h-11 text-left text-sm font-semibold text-primary" onClick={() => setMore((v) => !v)}>
          {more ? "Ocultar detalles" : "Dirección, notas y requisitos"}
        </button>
        {more ? (
          <>
            <Field label="Dirección">
              <TextInput value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </Field>
            <Field label="Estado">
              <SelectInput value={form.status} onChange={(e) => set({ status: e.target.value as ReservationStatus })}>
                {(Object.keys(RES_LABEL) as ReservationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {RES_LABEL[s]}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Requisitos" error={errors.requirements}>
              <TextArea value={form.requirements} onChange={(e) => set({ requirements: e.target.value })} />
            </Field>
            <Field label="Notas" error={errors.notes}>
              <TextArea value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isDemo} onChange={(e) => set({ isDemo: e.target.checked })} />
              Este es un dato de prueba
            </label>
          </>
        ) : null}
        {warnings.map((w) => (
          <p key={w} className="text-sm text-accent">
            {w}
          </p>
        ))}
        {collision ? (
          <div className="rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
            Ya existe una reserva en ese escenario, fecha y hora. Si no es un error, puedes guardarla igual.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => submit(false)}>{submitLabel}</Button>
          {collision ? (
            <Button variant="danger" onClick={() => submit(true)}>
              Guardar de todas formas
            </Button>
          ) : null}
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
