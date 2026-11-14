import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ImportarDialog } from "@/components/importar-dialog";
import { DocPanel } from "@/components/doc-panel";
import { Button, LoadingBlock, Page, SearchField } from "@/components/ui";
import { findPeopleDuplicates, includesLoose, normDoc, positionLabel, validateDocument, type DocRow } from "@/lib/domain";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/documentos")({ component: Documentos });

function Documentos() {
  const hydrated = useHydrated();
  const people = useVm((s) => s.people);
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const dupes = useMemo(() => findPeopleDuplicates(people), [people]);
  if (!hydrated) return <LoadingBlock />;

  const active = people.filter((p) => !p.archived);
  const rows: DocRow[] = active
    .filter((p) => !validateDocument(p.documentId))
    .filter((p) => includesLoose(`${p.fullName} ${p.documentId} ${p.phone}`, q))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))
    .map((p) => ({
      personId: p.id,
      name: p.fullName,
      doc: normDoc(p.documentId),
      phone: p.phone,
      position: positionLabel(p.position),
    }));
  const invalid = active.filter((p) => validateDocument(p.documentId));

  return (
    <Page
      title="Documentos"
      lede="La bóveda vive solo en este dispositivo. No se suben cédulas a ningún servidor ni se guardan fotos."
      actions={<Button onClick={() => setImportOpen(true)}>Importar lista</Button>}
    >
      <SearchField value={q} onChange={setQ} placeholder="Buscar por nombre o identificación" />
      {dupes.docs.length ? (
        <p className="mt-3 rounded-xl bg-danger-soft px-3 py-3 text-sm text-danger">
          Documento duplicado: {dupes.docs.map((g) => g.map((p) => p.fullName).join(" y ")).join("; ")}.
        </p>
      ) : null}
      {invalid.length ? (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-3 text-sm">
          Sin identificación válida: {invalid.map((p) => p.fullName).join(", ")}.
        </p>
      ) : null}
      <div className="mt-4">
        <DocPanel rows={rows} filename="boveda-documentos" title="Vista previa de la selección" />
      </div>
      <ImportarDialog open={importOpen} onOpenChange={setImportOpen} />
    </Page>
  );
}
