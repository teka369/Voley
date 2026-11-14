import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImportarDialog } from "@/components/importar-dialog";
import { PersonaDialog } from "@/components/persona-dialog";
import { Button, Card, DemoBadge, DocText, EmptyState, LoadingBlock, Page, SearchField, useConfirm } from "@/components/ui";
import { findPeopleDuplicates, includesLoose, POSITIONS, positionLabel, type Person, type Position } from "@/lib/domain";
import { copyText } from "@/lib/exporters";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/companeros")({ component: Companeros });

function Companeros() {
  const hydrated = useHydrated();
  const people = useVm((s) => s.people);
  const reservations = useVm((s) => s.reservations);
  const archivePerson = useVm((s) => s.archivePerson);
  const deletePerson = useVm((s) => s.deletePerson);
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [position, setPosition] = useState<Position | "todas">("todas");
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);

  const dupes = useMemo(() => findPeopleDuplicates(people), [people]);
  if (!hydrated) return <LoadingBlock />;

  const rows = people
    .filter((p) => (archived ? p.archived : !p.archived))
    .filter((p) => position === "todas" || p.position === position)
    .filter((p) => includesLoose(`${p.fullName} ${p.documentId} ${p.phone} ${p.tags.join(" ")} ${p.notes}`, q))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));

  return (
    <Page
      title="Compañeros"
      lede="Se registran una vez y se reutilizan en cada encuentro."
      actions={
        <>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Importar
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nuevo
          </Button>
        </>
      }
    >
      {dupes.docs.length ? (
        <div className="mb-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Hay identificaciones repetidas: {dupes.docs.map((g) => g.map((p) => p.fullName).join(" y ")).join("; ")}.
        </div>
      ) : null}
      {dupes.names.length ? (
        <div className="mb-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
          Nombres parecidos con documentos distintos: {dupes.names.map((g) => g.map((p) => p.fullName).join(" / ")).join("; ")}.
        </div>
      ) : null}
      <SearchField value={q} onChange={setQ} placeholder="Buscar nombre, cédula o etiqueta" />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <Filter on={position === "todas"} onClick={() => setPosition("todas")}>
          Todas
        </Filter>
        {POSITIONS.map((p) => (
          <Filter key={p.id} on={position === p.id} onClick={() => setPosition(p.id)}>
            {p.label}
          </Filter>
        ))}
        <Filter on={archived} onClick={() => setArchived((v) => !v)}>
          {archived ? "Viendo archivados" : "Ver archivados"}
        </Filter>
      </div>
      <div className="mt-4 grid gap-3">
        {rows.length ? (
          rows.map((p) => {
            const used = reservations.filter((r) => r.participants.some((x) => x.personId === p.id)).length;
            return (
              <Card key={p.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{p.fullName}</h2>
                      {p.isDemo ? <DemoBadge /> : null}
                    </div>
                    <p className="text-sm text-muted">
                      {positionLabel(p.position)}
                      {p.phone ? ` · ${p.phone}` : ""} · {used} encuentro{used === 1 ? "" : "s"}
                    </p>
                    <DocText value={p.documentId} />
                    {p.tags.length ? <p className="mt-1 text-xs text-muted">{p.tags.join(" · ")}</p> : null}
                    {p.notes ? <p className="mt-1 text-sm">{p.notes}</p> : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void copyText(p.documentId).then((ok) => (ok ? toast.success("Identificación copiada") : toast.error("No se pudo copiar")))
                    }
                  >
                    Copiar cédula
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => archivePerson(p.id, !p.archived)}>
                    {p.archived ? "Restaurar" : "Archivar"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void confirm({
                        title: `¿Eliminar a ${p.fullName}?`,
                        body: used
                          ? `Está en ${used} encuentro${used === 1 ? "" : "s"}. Se quitará de esas listas. Esta acción no se deshace.`
                          : "Se borra del directorio. Esta acción no se deshace.",
                        confirmLabel: "Eliminar",
                        danger: true,
                      }).then((ok) => {
                        if (ok) {
                          deletePerson(p.id);
                          toast.success("Compañero eliminado");
                        }
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Users}
            title={archived ? "No hay archivados" : "El directorio está vacío"}
            body="Agrega a tu grupo una vez. La identificación queda guardada para las próximas reservas."
            action={<Button onClick={() => setOpen(true)}>Agregar compañero</Button>}
          />
        )}
      </div>
      <PersonaDialog open={open} onOpenChange={setOpen} person={editing} />
      <ImportarDialog open={importOpen} onOpenChange={setImportOpen} />
    </Page>
  );
}

function Filter({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold ${on ? "bg-primary text-primary-fg" : "bg-surface text-fg"}`}
    >
      {children}
    </button>
  );
}
