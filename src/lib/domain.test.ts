import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Person,
  type Reservation,
  assess,
  buildDemo,
  classifyImport,
  cloneReservation,
  computeFinance,
  formatDocList,
  mergeBackup,
  parseBackup,
  parsePeopleText,
  personConflict,
  renderTemplate,
  rosterDocs,
  serializeBackup,
  slotCollision,
  validateDocument,
} from "./domain.ts";
import { buildPdf, toCsv, toExcelXml } from "./exporters.ts";

function person(id: string, fullName: string, documentId: string): Person {
  return {
    id,
    fullName,
    documentId,
    phone: "",
    position: "universal",
    notes: "",
    tags: [],
    archived: false,
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function reservation(partial: Partial<Reservation> & Pick<Reservation, "participants">): Reservation {
  return {
    id: "r1",
    venue: "Cancha Norte",
    address: "Calle 1",
    date: "2026-11-21",
    startTime: "19:00",
    endTime: "21:00",
    courtCost: 120000,
    capacity: 12,
    requiredDocuments: 12,
    status: "confirmada",
    notes: "",
    requirements: "",
    expenses: [],
    changelog: [],
    isDemo: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("encuentros y documentos", () => {
  const people = Array.from({ length: 12 }, (_, i) =>
    person(`p${i + 1}`, `Persona ${i + 1}`, `9000000${String(i + 1).padStart(3, "0")}`),
  );

  it("A-D pide 12 documentos, detecta que faltan 2 y completa la lista", () => {
    const partial = reservation({
      requiredDocuments: 12,
      participants: people.slice(0, 10).map((p) => ({
        personId: p.id,
        status: "pendiente" as const,
        paid: 0,
        addedAt: "2026-01-01T00:00:00.000Z",
      })),
    });
    const missing = assess(partial, people);
    assert.equal(missing.requiredDocs, 12);
    assert.equal(missing.collectedDocs, 10);
    assert.equal(missing.missingDocs, 2);
    assert.equal(missing.docsReady, false);

    const full = reservation({
      requiredDocuments: 12,
      participants: people.map((p) => ({
        personId: p.id,
        status: "pendiente" as const,
        paid: 0,
        addedAt: "2026-01-01T00:00:00.000Z",
      })),
    });
    const ready = assess(full, people);
    assert.equal(ready.collectedDocs, 12);
    assert.equal(ready.docsReady, true);
    const lines = formatDocList(rosterDocs(full, people), "ids").split("\n");
    assert.equal(lines.length, 12);
    assert.equal(lines[0], people[0]?.documentId);
    assert.equal(lines[11], people[11]?.documentId);
  });

  it("E detecta un documento duplicado al registrar o importar", () => {
    const existing = [person("a", "Ana Ríos", "9000000001")];
    const conflict = personConflict(existing, { fullName: "Alguien Más", documentId: "900.000.0001" });
    assert.equal(conflict.byDoc?.id, "a");
    assert.equal(validateDocument("900.000.0001"), null);
    const rows = classifyImport(parsePeopleText("Ana Ríos, 9000000001\nLuisa Mesa, 9000000099"), existing);
    assert.equal(rows[0]?.status, "duplicado");
    assert.equal(rows[1]?.status, "nuevo");
    const doubled = reservation({
      participants: [
        { personId: "a", status: "pendiente", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" },
        { personId: "b", status: "pendiente", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    const report = assess(doubled, [existing[0]!, person("b", "Otra Persona", "9000000001")]);
    assert.equal(report.duplicateDocIds.length, 1);
    assert.equal(report.collectedDocs, 1);
  });

  it("F advierte cuando se supera la capacidad", () => {
    const res = reservation({
      capacity: 12,
      participants: Array.from({ length: 13 }, (_, i) => ({
        personId: `p${i}`,
        status: "confirmado" as const,
        paid: 0,
        addedAt: "2026-01-01T00:00:00.000Z",
      })),
    });
    const report = assess(res, []);
    assert.equal(report.overCapacity, true);
    assert.equal(report.spotsLeft, -1);
    assert.equal(report.occupying, 13);
  });

  it("G un pendiente puede pasar a confirmado sin perder el cupo", () => {
    const res = reservation({
      participants: [{ personId: "p1", status: "pendiente", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" }],
    });
    const next: Reservation = {
      ...res,
      participants: res.participants.map((p) => (p.personId === "p1" ? { ...p, status: "confirmado" } : p)),
    };
    assert.equal(next.participants[0]?.status, "confirmado");
    assert.equal(assess(next, [person("p1", "Ana Ríos", "9000000001")]).confirmed, 1);
    assert.equal(assess(next, [person("p1", "Ana Ríos", "9000000001")]).occupying, 1);
  });

  it("H el balance resta cancha y gastos de lo recaudado", () => {
    const res = reservation({
      courtCost: 120000,
      expenses: [{ id: "e", label: "Agua", amount: 8000, at: "2026-01-01T00:00:00.000Z" }],
      participants: [
        { personId: "p1", status: "confirmado", paid: 60000, addedAt: "2026-01-01T00:00:00.000Z" },
        { personId: "p2", status: "pendiente", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" },
        { personId: "p3", status: "invitado", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    const fin = computeFinance(res);
    assert.equal(fin.shares.find((s) => s.personId === "p1")?.share, 60000);
    assert.equal(fin.shares.find((s) => s.personId === "p2")?.share, 60000);
    assert.equal(fin.shares.find((s) => s.personId === "p3")?.share, 0);
    assert.equal(fin.collected, 60000);
    assert.equal(fin.pending, 60000);
    assert.equal(fin.balance, 60000 - 120000 - 8000);
  });

  it("I duplicar conserva la lista y no copia pagos ni gastos", () => {
    const res = reservation({
      expenses: [{ id: "e", label: "Agua", amount: 8000, at: "2026-01-01T00:00:00.000Z" }],
      participants: [
        { personId: "p1", status: "asistio", paid: 50000, addedAt: "2026-01-01T00:00:00.000Z" },
        { personId: "p2", status: "no_asistio", paid: 10000, addedAt: "2026-01-01T00:00:00.000Z" },
        { personId: "p3", status: "cancelado", paid: 20000, addedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    const copy = cloneReservation(res, new Date(2026, 10, 14, 12));
    assert.notEqual(copy.id, res.id);
    assert.equal(copy.date, "2026-11-28");
    assert.equal(copy.status, "borrador");
    assert.equal(copy.expenses.length, 0);
    assert.equal(copy.participants.length, 3);
    assert.ok(copy.participants.every((p) => p.paid === 0));
    assert.equal(copy.participants[0]?.status, "confirmado");
    assert.equal(copy.participants[1]?.status, "pendiente");
    assert.equal(copy.participants[2]?.status, "invitado");
    assert.equal(copy.venue, res.venue);
    assert.equal(copy.requiredDocuments, 12);
  });

  it("K exporta y restaura una copia sin aceptar archivos ajenos", () => {
    const people = [person("p1", "Ana Ríos", "9000000001")];
    const reservations = [
      reservation({ participants: [{ personId: "p1", status: "confirmado", paid: 0, addedAt: "2026-01-01T00:00:00.000Z" }] }),
    ];
    const raw = serializeBackup({
      people,
      reservations,
      templates: [],
      prefs: {
        theme: "dark",
        organizerName: "Juan",
        defaultVenue: "",
        defaultAddress: "",
        defaultCapacity: 12,
        defaultRequiredDocs: 12,
        defaultCost: 100000,
        defaultStart: "19:00",
        defaultEnd: "21:00",
        maskDocuments: true,
        templatesSeeded: true,
      },
    });
    const parsed = parseBackup(raw);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;
    assert.equal(parsed.data.people.length, 1);
    assert.equal(parsed.data.people[0]?.fullName, "Ana Ríos");
    assert.equal(parsed.data.reservations[0]?.venue, "Cancha Norte");
    assert.equal(parsed.data.prefs.organizerName, "Juan");
    const bad = parseBackup('{"app":"otro","version":1}');
    assert.equal(bad.ok, false);
    const merged = mergeBackup({ people, reservations, templates: [] }, parsed.data);
    assert.equal(merged.peopleAdded, 0);
    assert.equal(merged.peopleSkipped, 1);
  });

  it("evita un choque de horario y arma variables de plantilla", () => {
    const res = reservation({ participants: [] });
    assert.ok(slotCollision([res], { venue: "cancha norte", date: res.date, startTime: res.startTime }));
    assert.equal(slotCollision([res], { venue: "cancha norte", date: res.date, startTime: "20:00", id: undefined }), undefined);
    const text = renderTemplate("Vamos a {{escenario}} el {{fecha}}", {
      escenario: "Cancha Norte",
      fecha: "Sábado",
    });
    assert.equal(text, "Vamos a Cancha Norte el Sábado");
  });

  it("el ejemplo de prueba trae 10 documentos de 12 y pagos a medias", () => {
    const demo = buildDemo(new Date(2026, 10, 13, 10));
    assert.equal(demo.people.length, 12);
    assert.ok(demo.people.every((p) => p.isDemo));
    const next = demo.reservations.find((r) => r.id === "demo-r-proximo");
    assert.ok(next);
    if (!next) return;
    const report = assess(next, demo.people);
    assert.equal(report.collectedDocs, 10);
    assert.equal(report.missingDocs, 2);
    assert.equal(report.docsReady, false);
    assert.equal(report.overCapacity, false);
    const fin = computeFinance(next);
    assert.ok(fin.collected > 0);
    assert.ok(fin.pending > 0);
    assert.equal(fin.collected + fin.pending, next.courtCost);
    const past = demo.reservations.find((r) => r.id === "demo-r-pasado");
    assert.equal(past?.status, "finalizada");
    assert.equal(past?.expenses.length, 1);
  });

  it("genera CSV, Excel y PDF", () => {
    const csv = toCsv([
      ["Nombre", "Identificación"],
      ["Ana Ríos", "9000000001"],
    ]);
    assert.ok(csv.includes("Ana Ríos"));
    assert.ok(csv.includes(";"));
    const xml = toExcelXml([["Nombre"], ["Ana Ríos"]]);
    assert.ok(xml.startsWith("<?xml"));
    assert.ok(xml.includes("Ana"));
    const pdf = buildPdf("Documentos", ["1. Ana Ríos — 9000000001"]);
    assert.equal(String.fromCharCode(...pdf.slice(0, 5)), "%PDF-");
  });
});
