import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addDaysISO,
  type AttendanceStatus,
  ATTENDANCE_LABEL,
  type Person,
  type PersonInput,
  type Prefs,
  type Reservation,
  type ReservationInput,
  type Template,
  type TemplateKind,
  blankReservation,
  buildDemo,
  cloneReservation,
  defaultPrefs,
  defaultTemplates,
  describeReservationChanges,
  logEntry,
  mergeBackup,
  normDoc,
  normPhone,
  parseBackup,
  personConflict,
  pushLogs,
  slotCollision,
  uid,
  validateDocument,
  validateName,
  validatePhone,
  validateReservation,
} from "@/lib/domain";

type Ok = { ok: true; id: string };
type Fail = { ok: false; error: string; collision?: boolean; existingId?: string };

type State = {
  people: Person[];
  reservations: Reservation[];
  templates: Template[];
  prefs: Prefs;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  addPerson: (input: PersonInput) => Ok | Fail;
  updatePerson: (id: string, input: PersonInput) => Ok | Fail;
  archivePerson: (id: string, archived: boolean) => void;
  deletePerson: (id: string) => void;
  addReservation: (input: ReservationInput, opts?: { force?: boolean }) => Ok | Fail;
  updateReservation: (id: string, input: ReservationInput, opts?: { force?: boolean }) => Ok | Fail;
  setReservationStatus: (id: string, status: Reservation["status"]) => void;
  duplicateReservation: (id: string) => Ok | Fail;
  addParticipants: (resId: string, personIds: string[]) => { added: number; skipped: number };
  removeParticipant: (resId: string, personId: string) => void;
  setParticipantStatus: (resId: string, personId: string, status: AttendanceStatus) => void;
  setParticipantPaid: (resId: string, personId: string, paid: number) => void;
  addExpense: (resId: string, label: string, amount: number) => { ok: true } | { ok: false; error: string };
  removeExpense: (resId: string, expenseId: string) => void;
  saveTemplate: (input: { id?: string; name: string; kind: TemplateKind; body: string }) => Ok | Fail;
  duplicateTemplate: (id: string) => Ok | Fail;
  deleteTemplate: (id: string) => void;
  resetTemplates: () => void;
  setPrefs: (patch: Partial<Prefs>) => void;
  replaceAll: (raw: string) => { ok: true; people: number; reservations: number } | Fail;
  mergeAll: (raw: string) => { ok: true; summary: string } | Fail;
  loadDemo: () => { ok: true } | Fail;
  clearDemo: () => void;
  clearAll: () => void;
};

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

function cleanTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const t of tags) {
    const v = t.trim().slice(0, 24);
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
    if (out.length >= 12) break;
  }
  return out;
}

function makePerson(input: PersonInput, id: string, createdAt: string): Person {
  return {
    id,
    fullName: input.fullName.trim().replace(/\s+/g, " "),
    documentId: normDoc(input.documentId),
    phone: normPhone(input.phone),
    position: input.position,
    notes: input.notes.slice(0, 2000),
    tags: cleanTags(input.tags),
    archived: false,
    isDemo: Boolean(input.isDemo),
    createdAt,
    updatedAt: createdAt,
  };
}

function applyReservation(base: Reservation | null, input: ReservationInput, at: string): Reservation {
  const checked = validateReservation(input);
  if (Object.keys(checked.errors).length) {
    throw new Error("Reserva inválida");
  }
  return {
    id: base?.id ?? uid(),
    venue: input.venue.trim(),
    address: input.address.trim(),
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    courtCost: Math.round(input.courtCost),
    capacity: input.capacity,
    requiredDocuments: input.requiredDocuments,
    status: input.status,
    notes: input.notes.slice(0, 2000),
    requirements: input.requirements.slice(0, 2000),
    participants: base?.participants ?? [],
    expenses: base?.expenses ?? [],
    changelog: base?.changelog ?? [logEntry("Reserva creada.", at)],
    isDemo: input.isDemo,
    createdAt: base?.createdAt ?? at,
    updatedAt: at,
  };
}

export const useVm = create<State>()(
  persist(
    (set, get) => ({
      people: [],
      reservations: [],
      templates: [],
      prefs: defaultPrefs,
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),
      addPerson: (input) => {
        const nameError = validateName(input.fullName);
        if (nameError) return { ok: false, error: nameError };
        const docError = validateDocument(input.documentId);
        if (docError) return { ok: false, error: docError };
        const phoneError = validatePhone(input.phone);
        if (phoneError) return { ok: false, error: phoneError };
        const conflict = personConflict(get().people, input);
        if (conflict.byDoc) {
          return {
            ok: false,
            error: `Esa identificación ya está en ${conflict.byDoc.fullName}.`,
            existingId: conflict.byDoc.id,
          };
        }
        const person = makePerson(input, uid(), new Date().toISOString());
        set({ people: [...get().people, person] });
        return { ok: true, id: person.id };
      },
      updatePerson: (id, input) => {
        const current = get().people.find((p) => p.id === id);
        if (!current) return { ok: false, error: "No encontramos a esa persona." };
        const nameError = validateName(input.fullName);
        if (nameError) return { ok: false, error: nameError };
        const docError = validateDocument(input.documentId);
        if (docError) return { ok: false, error: docError };
        const phoneError = validatePhone(input.phone);
        if (phoneError) return { ok: false, error: phoneError };
        const conflict = personConflict(get().people, { ...input, id });
        if (conflict.byDoc) {
          return {
            ok: false,
            error: `Esa identificación ya está en ${conflict.byDoc.fullName}.`,
            existingId: conflict.byDoc.id,
          };
        }
        const at = new Date().toISOString();
        const next = { ...makePerson({ ...input, isDemo: input.isDemo ?? current.isDemo }, id, current.createdAt), archived: current.archived, updatedAt: at };
        set({ people: get().people.map((p) => (p.id === id ? next : p)) });
        return { ok: true, id };
      },
      archivePerson: (id, archived) => {
        const at = new Date().toISOString();
        set({
          people: get().people.map((p) => (p.id === id ? { ...p, archived, updatedAt: at } : p)),
        });
      },
      deletePerson: (id) => {
        const person = get().people.find((p) => p.id === id);
        const at = new Date().toISOString();
        set({
          people: get().people.filter((p) => p.id !== id),
          reservations: get().reservations.map((r) => {
            if (!r.participants.some((p) => p.personId === id)) return r;
            return {
              ...r,
              participants: r.participants.filter((p) => p.personId !== id),
              updatedAt: at,
              changelog: pushLogs(
                r.changelog,
                [`Se quitó a ${person?.fullName ?? "un compañero"} del encuentro.`],
                at,
              ),
            };
          }),
        });
      },
      addReservation: (input, opts) => {
        const checked = validateReservation(input);
        const first = Object.values(checked.errors)[0];
        if (first) return { ok: false, error: first };
        const collision = slotCollision(get().reservations, input);
        if (collision && !opts?.force) {
          return {
            ok: false,
            error: "Ya hay una reserva en ese escenario, fecha y hora.",
            collision: true,
          };
        }
        const at = new Date().toISOString();
        const res = applyReservation(null, input, at);
        if (collision && opts?.force) {
          res.changelog = pushLogs(res.changelog, ["Se guardó aunque ya existía otra reserva en el mismo horario."], at);
        }
        set({ reservations: [...get().reservations, res] });
        return { ok: true, id: res.id };
      },
      updateReservation: (id, input, opts) => {
        const current = get().reservations.find((r) => r.id === id);
        if (!current) return { ok: false, error: "No encontramos esa reserva." };
        const checked = validateReservation(input);
        const first = Object.values(checked.errors)[0];
        if (first) return { ok: false, error: first };
        const collision = slotCollision(get().reservations, { ...input, id });
        if (collision && !opts?.force) {
          return {
            ok: false,
            error: "Ya hay otra reserva en ese escenario, fecha y hora.",
            collision: true,
          };
        }
        const at = new Date().toISOString();
        const next = applyReservation(current, input, at);
        const msgs = describeReservationChanges(current, input);
        if (collision && opts?.force) msgs.push("Se guardó aunque chocaba con otra reserva.");
        next.changelog = pushLogs(current.changelog, msgs, at);
        set({ reservations: get().reservations.map((r) => (r.id === id ? next : r)) });
        return { ok: true, id };
      },
      setReservationStatus: (id, status) => {
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) => {
            if (r.id !== id || r.status === status) return r;
            const label =
              status === "confirmada"
                ? "Se confirmó la reserva."
                : status === "cancelada"
                  ? "Se canceló la reserva."
                  : status === "finalizada"
                    ? "Se finalizó el encuentro."
                    : "La reserva volvió a borrador.";
            return {
              ...r,
              status,
              updatedAt: at,
              changelog: pushLogs(r.changelog, [label], at),
            };
          }),
        });
      },
      duplicateReservation: (id) => {
        const current = get().reservations.find((r) => r.id === id);
        if (!current) return { ok: false, error: "No encontramos esa reserva." };
        const copy = cloneReservation(current);
        let guard = 0;
        while (slotCollision(get().reservations, copy) && guard < 20) {
          copy.date = addDaysISO(copy.date, 7);
          guard += 1;
        }
        if (guard > 0) {
          copy.changelog = pushLogs(copy.changelog, ["Se movió la fecha para no chocar con otra reserva."]);
        }
        set({ reservations: [...get().reservations, copy] });
        return { ok: true, id: copy.id };
      },
      addParticipants: (resId, personIds) => {
        const res = get().reservations.find((r) => r.id === resId);
        if (!res) return { added: 0, skipped: personIds.length };
        const at = new Date().toISOString();
        const existing = new Set(res.participants.map((p) => p.personId));
        const people = get().people;
        let added = 0;
        let skipped = 0;
        const next = [...res.participants];
        const names: string[] = [];
        for (const personId of personIds) {
          if (existing.has(personId)) {
            skipped += 1;
            continue;
          }
          const person = people.find((p) => p.id === personId && !p.archived);
          if (!person) {
            skipped += 1;
            continue;
          }
          existing.add(personId);
          next.push({ personId, status: "pendiente", paid: 0, addedAt: at });
          names.push(person.fullName);
          added += 1;
        }
        if (!added) return { added, skipped };
        const message =
          names.length === 1 ? `Se agregó a ${names[0]}.` : `Se agregaron ${names.length} compañeros.`;
        set({
          reservations: get().reservations.map((r) =>
            r.id === resId
              ? { ...r, participants: next, updatedAt: at, changelog: pushLogs(r.changelog, [message], at) }
              : r,
          ),
        });
        return { added, skipped };
      },
      removeParticipant: (resId, personId) => {
        const person = get().people.find((p) => p.id === personId);
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) => {
            if (r.id !== resId) return r;
            return {
              ...r,
              participants: r.participants.filter((p) => p.personId !== personId),
              updatedAt: at,
              changelog: pushLogs(r.changelog, [`Se quitó a ${person?.fullName ?? "un compañero"}.`], at),
            };
          }),
        });
      },
      setParticipantStatus: (resId, personId, status) => {
        const person = get().people.find((p) => p.id === personId);
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) => {
            if (r.id !== resId) return r;
            const current = r.participants.find((p) => p.personId === personId);
            if (!current || current.status === status) return r;
            return {
              ...r,
              updatedAt: at,
              participants: r.participants.map((p) => (p.personId === personId ? { ...p, status } : p)),
              changelog: pushLogs(
                r.changelog,
                [`${person?.fullName ?? "Un compañero"} quedó como ${ATTENDANCE_LABEL[status].toLowerCase()}.`],
                at,
              ),
            };
          }),
        });
      },
      setParticipantPaid: (resId, personId, paid) => {
        const amount = Math.max(0, Math.min(100_000_000, Math.round(paid || 0)));
        const person = get().people.find((p) => p.id === personId);
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) => {
            if (r.id !== resId) return r;
            const current = r.participants.find((p) => p.personId === personId);
            if (!current || current.paid === amount) return r;
            return {
              ...r,
              updatedAt: at,
              participants: r.participants.map((p) => (p.personId === personId ? { ...p, paid: amount } : p)),
              changelog: pushLogs(r.changelog, [`Se registró un pago de ${person?.fullName ?? "un compañero"}.`], at),
            };
          }),
        });
      },
      addExpense: (resId, label, amount) => {
        const clean = label.trim();
        if (clean.length < 2) return { ok: false, error: "Escribe el concepto del gasto." };
        if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "El gasto debe ser mayor que cero." };
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) =>
            r.id === resId
              ? {
                  ...r,
                  updatedAt: at,
                  expenses: [...r.expenses, { id: uid(), label: clean.slice(0, 120), amount: Math.round(amount), at }],
                  changelog: pushLogs(r.changelog, [`Se agregó el gasto «${clean.slice(0, 80)}».`], at),
                }
              : r,
          ),
        });
        return { ok: true };
      },
      removeExpense: (resId, expenseId) => {
        const at = new Date().toISOString();
        set({
          reservations: get().reservations.map((r) =>
            r.id === resId
              ? {
                  ...r,
                  updatedAt: at,
                  expenses: r.expenses.filter((e) => e.id !== expenseId),
                  changelog: pushLogs(r.changelog, ["Se quitó un gasto."], at),
                }
              : r,
          ),
        });
      },
      saveTemplate: (input) => {
        const name = input.name.trim();
        if (name.length < 2) return { ok: false, error: "Ponle un nombre a la plantilla." };
        if (!input.body.trim()) return { ok: false, error: "Escribe el mensaje." };
        if (input.body.length > 8000) return { ok: false, error: "El mensaje es demasiado largo." };
        const at = new Date().toISOString();
        if (input.id) {
          const current = get().templates.find((t) => t.id === input.id);
          if (!current) return { ok: false, error: "No encontramos esa plantilla." };
          set({
            templates: get().templates.map((t) =>
              t.id === input.id ? { ...t, name, kind: input.kind, body: input.body, updatedAt: at } : t,
            ),
          });
          return { ok: true, id: input.id };
        }
        const id = uid();
        set({
          templates: [
            ...get().templates,
            { id, name, kind: input.kind, body: input.body, isDemo: false, createdAt: at, updatedAt: at },
          ],
        });
        return { ok: true, id };
      },
      duplicateTemplate: (id) => {
        const current = get().templates.find((t) => t.id === id);
        if (!current) return { ok: false, error: "No encontramos esa plantilla." };
        const at = new Date().toISOString();
        const copy: Template = {
          ...current,
          id: uid(),
          name: `Copia de ${current.name}`.slice(0, 80),
          isDemo: false,
          createdAt: at,
          updatedAt: at,
        };
        set({ templates: [...get().templates, copy] });
        return { ok: true, id: copy.id };
      },
      deleteTemplate: (id) => set({ templates: get().templates.filter((t) => t.id !== id) }),
      resetTemplates: () => {
        const defaults = defaultTemplates();
        const at = new Date().toISOString();
        const current = get().templates;
        const replaced = current.map((t) => {
          const d = defaults.find((x) => x.id === t.id);
          return d ? { ...d, updatedAt: at } : t;
        });
        const missing = defaults.filter((d) => !current.some((t) => t.id === d.id));
        set({ templates: [...replaced, ...missing], prefs: { ...get().prefs, templatesSeeded: true } });
      },
      setPrefs: (patch) => set({ prefs: { ...get().prefs, ...patch } }),
      replaceAll: (raw) => {
        const parsed = parseBackup(raw);
        if (!parsed.ok) return parsed;
        set({
          people: parsed.data.people,
          reservations: parsed.data.reservations,
          templates: parsed.data.templates.length ? parsed.data.templates : defaultTemplates(),
          prefs: { ...parsed.data.prefs, templatesSeeded: true },
        });
        return { ok: true, people: parsed.data.people.length, reservations: parsed.data.reservations.length };
      },
      mergeAll: (raw) => {
        const parsed = parseBackup(raw);
        if (!parsed.ok) return parsed;
        const merged = mergeBackup(get(), parsed.data);
        set({
          people: merged.people,
          reservations: merged.reservations,
          templates: merged.templates,
        });
        return {
          ok: true,
          summary: `Se agregaron ${merged.peopleAdded} compañeros y ${merged.reservationsAdded} encuentros. Se omitieron ${merged.peopleSkipped} repetidos.`,
        };
      },
      loadDemo: () => {
        if (get().people.some((p) => p.isDemo) || get().reservations.some((r) => r.isDemo)) {
          return { ok: false, error: "Ya hay datos de prueba. Bórralos primero si quieres volver a cargarlos." };
        }
        const demo = buildDemo();
        set({
          people: [...get().people, ...demo.people],
          reservations: [...get().reservations, ...demo.reservations],
        });
        return { ok: true };
      },
      clearDemo: () => {
        const demoIds = new Set(get().people.filter((p) => p.isDemo).map((p) => p.id));
        set({
          people: get().people.filter((p) => !p.isDemo),
          reservations: get()
            .reservations.filter((r) => !r.isDemo)
            .map((r) => ({
              ...r,
              participants: r.participants.filter((p) => !demoIds.has(p.personId)),
            })),
        });
      },
      clearAll: () => {
        set({
          people: [],
          reservations: [],
          templates: defaultTemplates(),
          prefs: { ...defaultPrefs, templatesSeeded: true, theme: get().prefs.theme },
        });
      },
    }),
    {
      name: "volleymanager.v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => (typeof window === "undefined" ? memoryStorage() : localStorage)),
      partialize: (s) => ({
        people: s.people,
        reservations: s.reservations,
        templates: s.templates,
        prefs: s.prefs,
      }),
    },
  ),
);

export function useHydrated(): boolean {
  return useVm((s) => s.hydrated);
}

export function blankFromPrefs(): ReservationInput {
  return blankReservation(useVm.getState().prefs);
}

let bootstrapped = false;

export function bootstrapStore(): void {
  if (bootstrapped || typeof window === "undefined") return;
  bootstrapped = true;
  const finish = () => {
    const s = useVm.getState();
    if (!s.prefs.templatesSeeded && s.templates.length === 0) {
      useVm.setState({
        templates: defaultTemplates(),
        prefs: { ...s.prefs, templatesSeeded: true },
        hydrated: true,
      });
    } else if (!s.hydrated) {
      useVm.setState({ hydrated: true });
    }
  };
  useVm.persist.onFinishHydration(() => finish());
  void useVm.persist.rehydrate();
}
