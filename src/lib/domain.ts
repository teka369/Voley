export type Position =
  | "armador"
  | "central"
  | "punta"
  | "opuesto"
  | "libero"
  | "universal";

export type AttendanceStatus =
  | "invitado"
  | "confirmado"
  | "pendiente"
  | "cancelado"
  | "asistio"
  | "no_asistio";

export type ReservationStatus = "borrador" | "confirmada" | "cancelada" | "finalizada";

export type TemplateKind =
  | "solicitud"
  | "invitacion"
  | "confirmacion"
  | "cancelacion"
  | "documentos"
  | "personalizado";

export type ThemeMode = "system" | "light" | "dark";

export type Person = {
  id: string;
  fullName: string;
  documentId: string;
  phone: string;
  position: Position;
  notes: string;
  tags: string[];
  archived: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Participant = {
  personId: string;
  status: AttendanceStatus;
  paid: number;
  addedAt: string;
};

export type ChangeLog = { id: string; at: string; message: string };

export type Expense = { id: string; label: string; amount: number; at: string };

export type Reservation = {
  id: string;
  venue: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  courtCost: number;
  capacity: number;
  requiredDocuments: number;
  status: ReservationStatus;
  notes: string;
  requirements: string;
  participants: Participant[];
  expenses: Expense[];
  changelog: ChangeLog[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Template = {
  id: string;
  name: string;
  kind: TemplateKind;
  body: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Prefs = {
  theme: ThemeMode;
  organizerName: string;
  defaultVenue: string;
  defaultAddress: string;
  defaultCapacity: number;
  defaultRequiredDocs: number;
  defaultCost: number;
  defaultStart: string;
  defaultEnd: string;
  maskDocuments: boolean;
  templatesSeeded: boolean;
};

export type ReservationInput = {
  venue: string;
  address: string;
  date: string;
  startTime: string;
  endTime: string;
  courtCost: number;
  capacity: number;
  requiredDocuments: number;
  status: ReservationStatus;
  notes: string;
  requirements: string;
  isDemo: boolean;
};

export const POSITIONS: { id: Position; label: string }[] = [
  { id: "armador", label: "Armador" },
  { id: "central", label: "Central" },
  { id: "punta", label: "Punta" },
  { id: "opuesto", label: "Opuesto" },
  { id: "libero", label: "Líbero" },
  { id: "universal", label: "Universal" },
];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  invitado: "Invitado",
  confirmado: "Confirmado",
  pendiente: "Pendiente",
  cancelado: "Canceló",
  asistio: "Asistió",
  no_asistio: "No asistió",
};

export const RES_LABEL: Record<ReservationStatus, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  finalizada: "Finalizada",
};

export const TEMPLATE_LABEL: Record<TemplateKind, string> = {
  solicitud: "Solicitud de reserva",
  invitacion: "Invitación",
  confirmacion: "Confirmación",
  cancelacion: "Cancelación",
  documentos: "Lista de documentos",
  personalizado: "Mensaje personalizado",
};

export const TEMPLATE_VARS: { key: string; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "hora_inicio", label: "Hora inicio" },
  { key: "hora_fin", label: "Hora fin" },
  { key: "escenario", label: "Escenario" },
  { key: "direccion", label: "Dirección" },
  { key: "nombres", label: "Nombres" },
  { key: "confirmados", label: "Confirmados" },
  { key: "costo", label: "Costo" },
  { key: "aporte", label: "Aporte" },
  { key: "cupos", label: "Cupos" },
  { key: "cupos_libres", label: "Cupos libres" },
  { key: "organizador", label: "Organizador" },
  { key: "documentos", label: "Documentos" },
  { key: "documentos_detalle", label: "Lista con nombres" },
  { key: "faltan_documentos", label: "Faltan" },
];

const OCCUPY: AttendanceStatus[] = ["invitado", "confirmado", "pendiente", "asistio"];
const POS = new Set<string>(POSITIONS.map((p) => p.id));
const ATT = new Set<string>(Object.keys(ATTENDANCE_LABEL));
const RST = new Set<string>(Object.keys(RES_LABEL));
const KINDS = new Set<string>(Object.keys(TEMPLATE_LABEL));

export const defaultPrefs: Prefs = {
  theme: "system",
  organizerName: "",
  defaultVenue: "",
  defaultAddress: "",
  defaultCapacity: 12,
  defaultRequiredDocs: 12,
  defaultCost: 120000,
  defaultStart: "19:00",
  defaultEnd: "21:00",
  maskDocuments: true,
  templatesSeeded: false,
};

export function uid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function logEntry(message: string, at = new Date().toISOString()): ChangeLog {
  return { id: uid(), at, message };
}

export function pushLogs(logs: ChangeLog[], messages: string[], at = new Date().toISOString()): ChangeLog[] {
  const next = [...logs, ...messages.filter(Boolean).map((m) => logEntry(m, at))];
  return next.slice(-80);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function nextPlayDate(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay();
  if (day === 6 && from.getHours() < 17) return isoDate(d);
  d.setDate(d.getDate() + (day === 6 ? 7 : 6 - day));
  return isoDate(d);
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function fechaLarga(iso: string): string {
  const d = parseLocalDate(iso);
  const dia = DIAS[d.getDay()] ?? "";
  const cap = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${cap} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fechaCorta(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]?.slice(0, 3)} ${d.getFullYear()}`;
}

export function cuando(iso: string, today = isoDate(new Date())): string {
  if (iso === today) return "Hoy";
  const diff = Math.round((parseLocalDate(iso).getTime() - parseLocalDate(today).getTime()) / 86400000);
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return fechaLarga(iso);
}

export function horaAmPm(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = (mStr ?? "00").slice(0, 2);
  if (!Number.isFinite(h)) return hhmm;
  const ap = h >= 12 ? "p. m." : "a. m.";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ap}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function cop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));
}

export function parseMoney(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

export function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

export function normDoc(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

export function normPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function formatDoc(raw: string): string {
  const d = normDoc(raw);
  if (!d) return "";
  if (/^\d+$/.test(d)) return d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return d;
}

export function maskDoc(raw: string): string {
  const d = normDoc(raw);
  if (!d) return "";
  if (d.length <= 4) return d;
  return `${"•".repeat(Math.min(6, d.length - 4))}${d.slice(-4)}`;
}

export function includesLoose(hay: string, needle: string): boolean {
  const n = normName(needle);
  if (!n) return true;
  return normName(hay).includes(n) || normDoc(hay).includes(normDoc(needle));
}

export function validateDocument(raw: string): string | null {
  const d = normDoc(raw);
  if (!d) return "Escribe el número de identificación.";
  if (!/\d/.test(d)) return "La identificación debe incluir números.";
  if (d.length < 5 || d.length > 15) return "Usa entre 5 y 15 caracteres, sin puntos.";
  return null;
}

export function validateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 3) return "Escribe el nombre completo.";
  if (name.length > 120) return "El nombre es demasiado largo.";
  return null;
}

export function validatePhone(raw: string): string | null {
  if (!raw.trim()) return null;
  const d = normPhone(raw);
  if (d.length !== 7 && d.length !== 10) return "El celular debe tener 10 dígitos (o 7 si es fijo).";
  return null;
}

export function positionLabel(id: Position): string {
  return POSITIONS.find((p) => p.id === id)?.label ?? "Universal";
}

export type PersonInput = {
  fullName: string;
  documentId: string;
  phone: string;
  position: Position;
  notes: string;
  tags: string[];
  isDemo?: boolean;
};

export function personConflict(
  people: Person[],
  draft: { id?: string; fullName: string; documentId: string },
): { byDoc?: Person; byName?: Person } {
  const doc = normDoc(draft.documentId);
  const name = normName(draft.fullName);
  const others = people.filter((p) => p.id !== draft.id);
  const byDoc = doc ? others.find((p) => normDoc(p.documentId) === doc) : undefined;
  const byName = others.find((p) => !p.archived && normName(p.fullName) === name && normDoc(p.documentId) !== doc);
  return { byDoc, byName };
}

export function validateReservation(input: ReservationInput): {
  errors: Partial<Record<keyof ReservationInput, string>>;
  warnings: string[];
} {
  const errors: Partial<Record<keyof ReservationInput, string>> = {};
  if (input.venue.trim().length < 2) errors.venue = "Escribe el escenario.";
  if (input.venue.trim().length > 120) errors.venue = "El escenario es demasiado largo.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) errors.date = "Elige una fecha válida.";
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) errors.startTime = "Hora de inicio inválida.";
  if (!/^\d{2}:\d{2}$/.test(input.endTime)) errors.endTime = "Hora de fin inválida.";
  if (!errors.startTime && !errors.endTime && input.endTime <= input.startTime) {
    errors.endTime = "La hora de fin debe ser después del inicio.";
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 40) {
    errors.capacity = "Los cupos van de 1 a 40.";
  }
  if (
    !Number.isInteger(input.requiredDocuments) ||
    input.requiredDocuments < 0 ||
    input.requiredDocuments > 40
  ) {
    errors.requiredDocuments = "Los documentos van de 0 a 40.";
  }
  if (!Number.isFinite(input.courtCost) || input.courtCost < 0 || input.courtCost > 100_000_000) {
    errors.courtCost = "Revisa el costo de la cancha.";
  }
  if (input.notes.length > 2000) errors.notes = "Las notas son demasiado largas.";
  if (input.requirements.length > 2000) errors.requirements = "Los requisitos son demasiado largos.";
  const warnings: string[] = [];
  if (input.requiredDocuments > input.capacity) {
    warnings.push("Pides más documentos que cupos.");
  }
  return { errors, warnings };
}

export function slotCollision(
  reservations: Reservation[],
  draft: { id?: string; venue: string; date: string; startTime: string },
): Reservation | undefined {
  const key = `${normName(draft.venue)}|${draft.date}|${draft.startTime}`;
  return reservations.find(
    (r) =>
      r.id !== draft.id &&
      r.status !== "cancelada" &&
      `${normName(r.venue)}|${r.date}|${r.startTime}` === key,
  );
}

export function peopleMap(people: Person[]): Map<string, Person> {
  return new Map(people.map((p) => [p.id, p]));
}

export type Assessment = {
  occupying: number;
  capacity: number;
  spotsLeft: number;
  overCapacity: boolean;
  confirmed: number;
  pending: number;
  invited: number;
  attended: number;
  noShow: number;
  cancelled: number;
  requiredDocs: number;
  collectedDocs: number;
  missingDocs: number;
  docsReady: boolean;
  duplicateDocIds: string[];
  peopleMissingDoc: string[];
};

export function isOccupying(status: AttendanceStatus): boolean {
  return OCCUPY.includes(status);
}

export function isPayer(status: AttendanceStatus): boolean {
  return status === "confirmado" || status === "pendiente" || status === "asistio";
}

export function assess(res: Reservation, people: Person[]): Assessment {
  const map = peopleMap(people);
  const parts = res.participants;
  const occupyingParts = parts.filter((p) => isOccupying(p.status));
  const docs: string[] = [];
  const missingPeople: string[] = [];
  for (const p of occupyingParts) {
    const person = map.get(p.personId);
    if (!person || validateDocument(person.documentId)) {
      missingPeople.push(p.personId);
      continue;
    }
    docs.push(normDoc(person.documentId));
  }
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d, (counts.get(d) ?? 0) + 1);
  const duplicateDocIds = [...counts.entries()].filter(([, n]) => n > 1).map(([d]) => d);
  const collected = new Set(docs).size;
  const occupying = occupyingParts.length;
  return {
    occupying,
    capacity: res.capacity,
    spotsLeft: res.capacity - occupying,
    overCapacity: occupying > res.capacity,
    confirmed: parts.filter((p) => p.status === "confirmado").length,
    pending: parts.filter((p) => p.status === "pendiente").length,
    invited: parts.filter((p) => p.status === "invitado").length,
    attended: parts.filter((p) => p.status === "asistio").length,
    noShow: parts.filter((p) => p.status === "no_asistio").length,
    cancelled: parts.filter((p) => p.status === "cancelado").length,
    requiredDocs: res.requiredDocuments,
    collectedDocs: collected,
    missingDocs: Math.max(0, res.requiredDocuments - collected),
    docsReady: collected >= res.requiredDocuments,
    duplicateDocIds,
    peopleMissingDoc: missingPeople,
  };
}

export type ShareLine = { personId: string; share: number; paid: number; owes: number };

export type Finance = {
  courtCost: number;
  expensesTotal: number;
  collected: number;
  pending: number;
  balance: number;
  shares: ShareLine[];
};

export function computeFinance(res: Reservation): Finance {
  const payers = res.participants.filter((p) => isPayer(p.status));
  const n = payers.length;
  const base = n > 0 ? Math.floor(res.courtCost / n) : 0;
  const rem = n > 0 ? res.courtCost - base * n : 0;
  const shares = res.participants.map((p) => {
    const paid = Math.max(0, Math.round(Number.isFinite(p.paid) ? p.paid : 0));
    if (!isPayer(p.status)) return { personId: p.personId, share: 0, paid, owes: 0 };
    const index = payers.findIndex((x) => x.personId === p.personId);
    const share = base + (index >= 0 && index < rem ? 1 : 0);
    return { personId: p.personId, share, paid, owes: Math.max(0, share - paid) };
  });
  const collected = shares.reduce((s, x) => s + x.paid, 0);
  const expensesTotal = res.expenses.reduce(
    (s, e) => s + Math.max(0, Math.round(Number.isFinite(e.amount) ? e.amount : 0)),
    0,
  );
  const pending = shares.reduce((s, x) => s + x.owes, 0);
  return {
    courtCost: res.courtCost,
    expensesTotal,
    collected,
    pending,
    balance: collected - res.courtCost - expensesTotal,
    shares,
  };
}

export type DocRow = { personId: string; name: string; doc: string; phone: string; position: string };

export function rosterDocs(res: Reservation, people: Person[]): DocRow[] {
  const map = peopleMap(people);
  const rows: DocRow[] = [];
  const seen = new Set<string>();
  for (const p of res.participants) {
    if (!isOccupying(p.status)) continue;
    const person = map.get(p.personId);
    if (!person || validateDocument(person.documentId)) continue;
    const doc = normDoc(person.documentId);
    if (seen.has(doc)) continue;
    seen.add(doc);
    rows.push({
      personId: person.id,
      name: person.fullName,
      doc,
      phone: person.phone,
      position: positionLabel(person.position),
    });
  }
  return rows;
}

export function formatDocList(rows: { name: string; doc: string }[], mode: "ids" | "names"): string {
  if (mode === "ids") return rows.map((r) => r.doc).join("\n");
  return rows.map((r, i) => `${i + 1}. ${r.name} — ${r.doc}`).join("\n");
}

function carryStatus(s: AttendanceStatus): AttendanceStatus {
  if (s === "asistio") return "confirmado";
  if (s === "no_asistio") return "pendiente";
  if (s === "cancelado") return "invitado";
  return s;
}

export function cloneReservation(src: Reservation, now = new Date()): Reservation {
  const at = now.toISOString();
  return {
    ...src,
    id: uid(),
    date: addDaysISO(src.date, 7),
    status: "borrador",
    participants: src.participants.map((p) => ({
      personId: p.personId,
      status: carryStatus(p.status),
      paid: 0,
      addedAt: at,
    })),
    expenses: [],
    changelog: [logEntry("Encuentro duplicado. Los pagos y gastos no se copiaron.", at)],
    createdAt: at,
    updatedAt: at,
  };
}

export function blankReservation(prefs: Prefs, now = new Date()): ReservationInput {
  return {
    venue: prefs.defaultVenue,
    address: prefs.defaultAddress,
    date: nextPlayDate(now),
    startTime: prefs.defaultStart || "19:00",
    endTime: prefs.defaultEnd || "21:00",
    courtCost: prefs.defaultCost,
    capacity: prefs.defaultCapacity,
    requiredDocuments: prefs.defaultRequiredDocs,
    status: "borrador",
    notes: "",
    requirements: "",
    isDemo: false,
  };
}

export function inputFromReservation(res: Reservation): ReservationInput {
  return {
    venue: res.venue,
    address: res.address,
    date: res.date,
    startTime: res.startTime,
    endTime: res.endTime,
    courtCost: res.courtCost,
    capacity: res.capacity,
    requiredDocuments: res.requiredDocuments,
    status: res.status,
    notes: res.notes,
    requirements: res.requirements,
    isDemo: res.isDemo,
  };
}

export function isUpcoming(res: Reservation, today = isoDate(new Date())): boolean {
  if (res.status === "cancelada" || res.status === "finalizada") return false;
  return res.date >= today;
}

export function isHistory(res: Reservation, today = isoDate(new Date())): boolean {
  return res.status === "finalizada" || res.status === "cancelada" || res.date < today;
}

export type ParsedPerson = {
  fullName: string;
  documentId: string;
  phone: string;
  position: Position | "";
  line: number;
  error: string | null;
};

const POSITION_ALIASES: Record<string, Position> = {
  armador: "armador",
  central: "central",
  punta: "punta",
  opuesto: "opuesto",
  libero: "libero",
  universal: "universal",
};

export function parsePeopleText(text: string): ParsedPerson[] {
  const lines = text.split(/\r?\n/);
  const out: ParsedPerson[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]?.trim() ?? "";
    if (!raw || raw.startsWith("#")) continue;
    const lower = normName(raw);
    if (
      i < 5 &&
      lower.includes("nombre") &&
      (lower.includes("cedula") || lower.includes("documento") || lower.includes("identificacion"))
    ) {
      continue;
    }
    let parts = raw
      .split(/[;\t|]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      parts = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    let fullName = "";
    let documentId = "";
    let phone = "";
    let position: Position | "" = "";
    if (parts.length >= 2) {
      const docIdx = parts.findIndex((p) => {
        const d = normDoc(p);
        return d.length >= 5 && d.length <= 15 && /\d/.test(d) && /^[0-9A-Za-z.\-\s]+$/.test(p);
      });
      if (docIdx >= 0) {
        documentId = normDoc(parts[docIdx] ?? "");
        const rest = parts.filter((_, idx) => idx !== docIdx);
        fullName = rest[0] ?? "";
        for (const extra of rest.slice(1)) {
          const pos = POSITION_ALIASES[normName(extra)];
          if (pos) position = pos;
          else if (!phone && (normPhone(extra).length === 7 || normPhone(extra).length === 10)) {
            phone = normPhone(extra);
          }
        }
      } else {
        fullName = parts[0] ?? "";
        documentId = normDoc(parts[1] ?? "");
      }
    } else {
      const m = raw.match(/^(.*?)[\s–—-]+([0-9][0-9A-Za-z.\s]{4,})$/);
      if (m) {
        fullName = m[1]?.trim() ?? "";
        documentId = normDoc(m[2] ?? "");
      } else {
        fullName = raw;
      }
    }
    fullName = fullName.replace(/\s+/g, " ").trim();
    let error: string | null = validateName(fullName);
    if (!error) error = validateDocument(documentId);
    out.push({ fullName, documentId, phone, position, line: i + 1, error });
  }
  return out;
}

export type ClassifiedImport = ParsedPerson & {
  status: "nuevo" | "duplicado" | "invalido";
  existingId?: string;
};

export function classifyImport(rows: ParsedPerson[], people: Person[]): ClassifiedImport[] {
  const seen = new Set<string>();
  return rows.map((row) => {
    if (row.error) return { ...row, status: "invalido" };
    const doc = normDoc(row.documentId);
    const existing = people.find((p) => normDoc(p.documentId) === doc);
    if (existing || seen.has(doc)) {
      return { ...row, status: "duplicado", existingId: existing?.id };
    }
    seen.add(doc);
    return { ...row, status: "nuevo" };
  });
}

export function findPeopleDuplicates(people: Person[]): { docs: Person[][]; names: Person[][] } {
  const byDoc = new Map<string, Person[]>();
  const byName = new Map<string, Person[]>();
  for (const p of people) {
    if (p.archived) continue;
    const d = normDoc(p.documentId);
    if (d) byDoc.set(d, [...(byDoc.get(d) ?? []), p]);
    const n = normName(p.fullName);
    if (n) byName.set(n, [...(byName.get(n) ?? []), p]);
  }
  return {
    docs: [...byDoc.values()].filter((g) => g.length > 1),
    names: [...byName.values()].filter((g) => g.length > 1 && new Set(g.map((p) => normDoc(p.documentId))).size > 1),
  };
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, key: string) => {
    const k = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] ?? "" : m;
  });
}

export function templateVars(
  res: Reservation | undefined,
  people: Person[],
  prefs: Prefs,
): Record<string, string> {
  if (!res) {
    return {
      fecha: "",
      hora_inicio: "",
      hora_fin: "",
      escenario: "",
      direccion: "",
      nombres: "",
      confirmados: "",
      costo: "",
      aporte: "",
      cupos: "",
      cupos_libres: "",
      organizador: prefs.organizerName,
      documentos: "",
      documentos_detalle: "",
      faltan_documentos: "",
    };
  }
  const a = assess(res, people);
  const fin = computeFinance(res);
  const map = peopleMap(people);
  const names = res.participants
    .filter((p) => isOccupying(p.status))
    .map((p) => map.get(p.personId)?.fullName)
    .filter((n): n is string => Boolean(n));
  const confirmed = res.participants
    .filter((p) => p.status === "confirmado" || p.status === "asistio")
    .map((p) => map.get(p.personId)?.fullName)
    .filter((n): n is string => Boolean(n));
  const docs = rosterDocs(res, people);
  const share = fin.shares.find((s) => s.share > 0)?.share ?? 0;
  return {
    fecha: fechaLarga(res.date),
    hora_inicio: horaAmPm(res.startTime),
    hora_fin: horaAmPm(res.endTime),
    escenario: res.venue,
    direccion: res.address,
    nombres: names.join(", "),
    confirmados: confirmed.join(", "),
    costo: cop(res.courtCost),
    aporte: cop(share),
    cupos: String(res.capacity),
    cupos_libres: String(Math.max(0, a.spotsLeft)),
    organizador: prefs.organizerName,
    documentos: formatDocList(docs, "ids"),
    documentos_detalle: formatDocList(docs, "names"),
    faltan_documentos: a.docsReady ? "0" : String(a.missingDocs),
  };
}

export function defaultTemplates(now = new Date().toISOString()): Template[] {
  const t = (
    id: string,
    name: string,
    kind: TemplateKind,
    body: string,
  ): Template => ({
    id,
    name,
    kind,
    body,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  });
  return [
    t(
      "tpl-solicitud",
      "Solicitud de reserva",
      "solicitud",
      "Hola, quiero reservar la cancha.\n\nEscenario: {{escenario}}\nDirección: {{direccion}}\nFecha: {{fecha}}\nHorario: {{hora_inicio}} a {{hora_fin}}\nCupos: {{cupos}}\n\nQuedo atento. Gracias.\n{{organizador}}",
    ),
    t(
      "tpl-invitacion",
      "Invitación al encuentro",
      "invitacion",
      "¡Hola! Hay voleibol.\n\n{{fecha}}\n{{hora_inicio}} a {{hora_fin}}\n{{escenario}}\n{{direccion}}\n\nEl aporte es {{aporte}} (cancha {{costo}}).\nConfírmame si vienes. Cupos libres: {{cupos_libres}}.\n\n{{organizador}}",
    ),
    t(
      "tpl-confirmacion",
      "Confirmación",
      "confirmacion",
      "Quedó confirmado el voleibol.\n\n{{fecha}}, {{hora_inicio}} a {{hora_fin}}\n{{escenario}} — {{direccion}}\n\nVan: {{confirmados}}\n\nLleva el aporte de {{aporte}}. Nos vemos en la cancha.",
    ),
    t(
      "tpl-cancelacion",
      "Cancelación",
      "cancelacion",
      "Hola, se cancela el voleibol del {{fecha}} en {{escenario}} ({{hora_inicio}}).\n\nAvisen si queda alguna duda. Gracias.\n{{organizador}}",
    ),
    t(
      "tpl-documentos",
      "Lista de documentos",
      "documentos",
      "Documentos para la reserva en {{escenario}} el {{fecha}}.\n\n{{documentos_detalle}}\n\nFaltan: {{faltan_documentos}}",
    ),
    t(
      "tpl-personalizado",
      "Mensaje en blanco",
      "personalizado",
      "Hola.\n\n{{fecha}} · {{escenario}}\n{{nombres}}\n\n{{organizador}}",
    ),
  ];
}

export type BackupFile = {
  app: "volleymanager";
  version: 1;
  exportedAt: string;
  people: Person[];
  reservations: Reservation[];
  templates: Template[];
  prefs: Prefs;
};

function asString(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  return v.slice(0, max);
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asInt(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < min || n > max) return null;
  return n;
}

function sanitizePerson(v: unknown): Person | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = asString(o.id, 80);
  const fullName = asString(o.fullName, 120);
  const documentId = asString(o.documentId, 40);
  if (!id || !fullName || documentId === null) return null;
  if (validateName(fullName) || validateDocument(documentId)) return null;
  const position = typeof o.position === "string" && POS.has(o.position) ? (o.position as Position) : "universal";
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((t): t is string => typeof t === "string").map((t) => t.slice(0, 24)).slice(0, 12)
    : [];
  const phone = asString(o.phone, 20) ?? "";
  return {
    id,
    fullName: fullName.trim(),
    documentId: normDoc(documentId),
    phone: normPhone(phone),
    position,
    notes: asString(o.notes, 2000) ?? "",
    tags,
    archived: asBool(o.archived),
    isDemo: asBool(o.isDemo),
    createdAt: asString(o.createdAt, 40) ?? new Date().toISOString(),
    updatedAt: asString(o.updatedAt, 40) ?? new Date().toISOString(),
  };
}

function sanitizeParticipant(v: unknown): Participant | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const personId = asString(o.personId, 80);
  if (!personId || typeof o.status !== "string" || !ATT.has(o.status)) return null;
  const paid = asInt(o.paid, 0, 100_000_000) ?? 0;
  return {
    personId,
    status: o.status as AttendanceStatus,
    paid,
    addedAt: asString(o.addedAt, 40) ?? new Date().toISOString(),
  };
}

function sanitizeReservation(v: unknown): Reservation | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = asString(o.id, 80);
  const venue = asString(o.venue, 120);
  const date = asString(o.date, 10);
  const startTime = asString(o.startTime, 5);
  const endTime = asString(o.endTime, 5);
  if (!id || !venue || !date || !startTime || !endTime) return null;
  if (typeof o.status !== "string" || !RST.has(o.status)) return null;
  const capacity = asInt(o.capacity, 1, 40);
  const requiredDocuments = asInt(o.requiredDocuments, 0, 40);
  const courtCost = asInt(o.courtCost, 0, 100_000_000);
  if (capacity === null || requiredDocuments === null || courtCost === null) return null;
  if (!Array.isArray(o.participants) || !Array.isArray(o.expenses) || !Array.isArray(o.changelog)) return null;
  const participants = o.participants.map(sanitizeParticipant).filter((p): p is Participant => p !== null);
  if (participants.length !== o.participants.length) return null;
  const expenses: Expense[] = [];
  for (const e of o.expenses) {
    if (!e || typeof e !== "object") return null;
    const x = e as Record<string, unknown>;
    const eid = asString(x.id, 80);
    const label = asString(x.label, 120);
    const amount = asInt(x.amount, 0, 100_000_000);
    if (!eid || !label || amount === null) return null;
    expenses.push({ id: eid, label, amount, at: asString(x.at, 40) ?? new Date().toISOString() });
  }
  const changelog: ChangeLog[] = [];
  for (const c of o.changelog.slice(-80)) {
    if (!c || typeof c !== "object") return null;
    const x = c as Record<string, unknown>;
    const cid = asString(x.id, 80);
    const message = asString(x.message, 300);
    if (!cid || !message) return null;
    changelog.push({ id: cid, at: asString(x.at, 40) ?? new Date().toISOString(), message });
  }
  return {
    id,
    venue: venue.trim(),
    address: asString(o.address, 180) ?? "",
    date,
    startTime,
    endTime,
    courtCost,
    capacity,
    requiredDocuments,
    status: o.status as ReservationStatus,
    notes: asString(o.notes, 2000) ?? "",
    requirements: asString(o.requirements, 2000) ?? "",
    participants,
    expenses,
    changelog,
    isDemo: asBool(o.isDemo),
    createdAt: asString(o.createdAt, 40) ?? new Date().toISOString(),
    updatedAt: asString(o.updatedAt, 40) ?? new Date().toISOString(),
  };
}

function sanitizeTemplate(v: unknown): Template | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = asString(o.id, 80);
  const name = asString(o.name, 80);
  const body = asString(o.body, 8000);
  if (!id || !name || body === null) return null;
  if (typeof o.kind !== "string" || !KINDS.has(o.kind)) return null;
  return {
    id,
    name,
    kind: o.kind as TemplateKind,
    body,
    isDemo: asBool(o.isDemo),
    createdAt: asString(o.createdAt, 40) ?? new Date().toISOString(),
    updatedAt: asString(o.updatedAt, 40) ?? new Date().toISOString(),
  };
}

function sanitizePrefs(v: unknown): Prefs {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const theme: ThemeMode = o.theme === "light" || o.theme === "dark" || o.theme === "system" ? o.theme : "system";
  return {
    theme,
    organizerName: asString(o.organizerName, 80) ?? "",
    defaultVenue: asString(o.defaultVenue, 120) ?? "",
    defaultAddress: asString(o.defaultAddress, 180) ?? "",
    defaultCapacity: asInt(o.defaultCapacity, 1, 40) ?? defaultPrefs.defaultCapacity,
    defaultRequiredDocs: asInt(o.defaultRequiredDocs, 0, 40) ?? defaultPrefs.defaultRequiredDocs,
    defaultCost: asInt(o.defaultCost, 0, 100_000_000) ?? defaultPrefs.defaultCost,
    defaultStart: /^\d{2}:\d{2}$/.test(String(o.defaultStart)) ? String(o.defaultStart) : defaultPrefs.defaultStart,
    defaultEnd: /^\d{2}:\d{2}$/.test(String(o.defaultEnd)) ? String(o.defaultEnd) : defaultPrefs.defaultEnd,
    maskDocuments: asBool(o.maskDocuments, true),
    templatesSeeded: true,
  };
}

export function serializeBackup(data: {
  people: Person[];
  reservations: Reservation[];
  templates: Template[];
  prefs: Prefs;
}): string {
  const file: BackupFile = {
    app: "volleymanager",
    version: 1,
    exportedAt: new Date().toISOString(),
    people: data.people,
    reservations: data.reservations,
    templates: data.templates,
    prefs: data.prefs,
  };
  return JSON.stringify(file);
}

export function parseBackup(text: string): { ok: true; data: BackupFile } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "El archivo no es un JSON válido." };
  }
  if (!raw || typeof raw !== "object") return { ok: false, error: "La copia no tiene el formato esperado." };
  const o = raw as Record<string, unknown>;
  if (o.app !== "volleymanager") return { ok: false, error: "Esta copia no es de VolleyManager." };
  if (o.version !== 1) return { ok: false, error: "La versión de la copia no es compatible." };
  if (!Array.isArray(o.people) || !Array.isArray(o.reservations) || !Array.isArray(o.templates)) {
    return { ok: false, error: "La copia está incompleta." };
  }
  if (o.people.length > 5000 || o.reservations.length > 2000 || o.templates.length > 200) {
    return { ok: false, error: "La copia es demasiado grande para importarla aquí." };
  }
  const people = o.people.map(sanitizePerson).filter((x): x is Person => x !== null);
  if (people.length !== o.people.length) return { ok: false, error: "Hay compañeros con datos inválidos en la copia." };
  const reservations = o.reservations.map(sanitizeReservation).filter((x): x is Reservation => x !== null);
  if (reservations.length !== o.reservations.length) {
    return { ok: false, error: "Hay encuentros con datos inválidos en la copia." };
  }
  const templates = o.templates.map(sanitizeTemplate).filter((x): x is Template => x !== null);
  if (templates.length !== o.templates.length) return { ok: false, error: "Hay plantillas inválidas en la copia." };
  return {
    ok: true,
    data: {
      app: "volleymanager",
      version: 1,
      exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : "",
      people,
      reservations,
      templates,
      prefs: sanitizePrefs(o.prefs),
    },
  };
}

export function mergeBackup(
  current: { people: Person[]; reservations: Reservation[]; templates: Template[] },
  incoming: BackupFile,
): {
  people: Person[];
  reservations: Reservation[];
  templates: Template[];
  peopleAdded: number;
  peopleSkipped: number;
  reservationsAdded: number;
  templatesAdded: number;
} {
  const people = [...current.people];
  let peopleAdded = 0;
  let peopleSkipped = 0;
  for (const p of incoming.people) {
    if (people.some((x) => x.id === p.id || normDoc(x.documentId) === normDoc(p.documentId))) {
      peopleSkipped += 1;
      continue;
    }
    people.push(p);
    peopleAdded += 1;
  }
  const reservations = [...current.reservations];
  let reservationsAdded = 0;
  for (const r of incoming.reservations) {
    if (reservations.some((x) => x.id === r.id)) continue;
    reservations.push(r);
    reservationsAdded += 1;
  }
  const templates = [...current.templates];
  let templatesAdded = 0;
  for (const t of incoming.templates) {
    if (templates.some((x) => x.id === t.id)) continue;
    templates.push(t);
    templatesAdded += 1;
  }
  return { people, reservations, templates, peopleAdded, peopleSkipped, reservationsAdded, templatesAdded };
}

const DEMO_NAMES = [
  "Ana Ríos",
  "Camilo Herrera",
  "Valentina Mora",
  "Juan Esteban Paz",
  "Laura Giraldo",
  "Santiago Cano",
  "Mariana Ospina",
  "Daniel Restrepo",
  "Sara Quintero",
  "Andrés Mejía",
  "Juliana Castaño",
  "Felipe Aguilar",
];

const DEMO_POS: Position[] = [
  "armador",
  "punta",
  "central",
  "opuesto",
  "libero",
  "punta",
  "armador",
  "central",
  "universal",
  "punta",
  "opuesto",
  "libero",
];

export function buildDemo(now = new Date()): { people: Person[]; reservations: Reservation[] } {
  const at = now.toISOString();
  const people: Person[] = DEMO_NAMES.map((fullName, i) => {
    const n = String(i + 1).padStart(2, "0");
    return {
      id: `demo-p-${n}`,
      fullName,
      documentId: `90000000${n}`,
      phone: `30000000${n}`,
      position: DEMO_POS[i] ?? "universal",
      notes: "Registro ficticio de demostración. No es una persona real.",
      tags: ["prueba"],
      archived: false,
      isDemo: true,
      createdAt: at,
      updatedAt: at,
    };
  });

  const upcomingParts: Participant[] = people.slice(0, 10).map((p, i) => ({
    personId: p.id,
    status: i < 6 ? "confirmado" : i < 9 ? "pendiente" : "invitado",
    paid: 0,
    addedAt: at,
  }));

  const upcoming: Reservation = {
    id: "demo-r-proximo",
    venue: "Cancha de ejemplo El Poblado",
    address: "Dirección de prueba, Medellín",
    date: nextPlayDate(now),
    startTime: "19:00",
    endTime: "21:00",
    courtCost: 120000,
    capacity: 12,
    requiredDocuments: 12,
    status: "confirmada",
    notes: "Dato de prueba. Tiene 10 de 12 documentos. Se puede borrar en Ajustes.",
    requirements: "Llevar documento. Balón del escenario.",
    participants: upcomingParts,
    expenses: [],
    changelog: [
      logEntry("Encuentro de prueba creado.", at),
      logEntry("Se agregaron 10 compañeros de prueba.", at),
    ],
    isDemo: true,
    createdAt: at,
    updatedAt: at,
  };
  const fin = computeFinance(upcoming);
  let paidCount = 0;
  upcoming.participants = upcoming.participants.map((p) => {
    const share = fin.shares.find((s) => s.personId === p.personId);
    if (share && share.share > 0 && paidCount < 4) {
      paidCount += 1;
      return { ...p, paid: share.share };
    }
    return p;
  });

  const pastDate = (() => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = d.getDay();
    const back = (day + 1) % 7;
    d.setDate(d.getDate() - (back === 0 ? 7 : back));
    return isoDate(d);
  })();

  const pastParts: Participant[] = people.slice(0, 10).map((p, i) => ({
    personId: p.id,
    status: i < 8 ? "asistio" : "no_asistio",
    paid: 0,
    addedAt: at,
  }));
  const past: Reservation = {
    id: "demo-r-pasado",
    venue: "Cancha de ejemplo Belén",
    address: "Dirección de prueba, Medellín",
    date: pastDate,
    startTime: "08:00",
    endTime: "10:00",
    courtCost: 100000,
    capacity: 12,
    requiredDocuments: 8,
    status: "finalizada",
    notes: "Encuentro ficticio ya jugado, solo para el historial.",
    requirements: "",
    participants: pastParts,
    expenses: [{ id: "demo-e-1", label: "Agua (prueba)", amount: 8000, at }],
    changelog: [logEntry("Encuentro de prueba finalizado.", at)],
    isDemo: true,
    createdAt: at,
    updatedAt: at,
  };
  const pastFin = computeFinance(past);
  past.participants = past.participants.map((p) => {
    const share = pastFin.shares.find((s) => s.personId === p.personId);
    return share && share.share > 0 ? { ...p, paid: share.share } : p;
  });

  return { people, reservations: [upcoming, past] };
}

export function describeReservationChanges(prev: Reservation, next: ReservationInput): string[] {
  const msgs: string[] = [];
  if (next.venue.trim() !== prev.venue) msgs.push("Se cambió el escenario.");
  if (next.address.trim() !== prev.address) msgs.push("Se cambió la dirección.");
  if (next.date !== prev.date || next.startTime !== prev.startTime || next.endTime !== prev.endTime) {
    msgs.push("Se cambió la fecha o el horario.");
  }
  if (next.courtCost !== prev.courtCost) msgs.push("Se actualizó el costo de la cancha.");
  if (next.capacity !== prev.capacity) msgs.push("Se actualizó la capacidad.");
  if (next.requiredDocuments !== prev.requiredDocuments) msgs.push("Se actualizó la cantidad de documentos exigidos.");
  if (next.status !== prev.status) msgs.push(`La reserva pasó a ${RES_LABEL[next.status].toLowerCase()}.`);
  if (next.notes !== prev.notes || next.requirements !== prev.requirements) msgs.push("Se actualizaron notas o requisitos.");
  if (next.isDemo !== prev.isDemo) msgs.push(next.isDemo ? "Se marcó como dato de prueba." : "Se quitó la marca de prueba.");
  if (!msgs.length) msgs.push("Se guardaron cambios de la reserva.");
  return msgs;
}
