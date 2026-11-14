import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Modal, TextArea } from "@/components/ui";
import { classifyImport, parsePeopleText, type Position } from "@/lib/domain";
import { useVm } from "@/lib/store";

export function ImportarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const people = useVm((s) => s.people);
  const addPerson = useVm((s) => s.addPerson);
  const [text, setText] = useState("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const rows = useMemo(() => classifyImport(parsePeopleText(text), people), [text, people]);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("El archivo es demasiado grande.");
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      setChecked({});
    } catch {
      toast.error("No se pudo leer el archivo.");
    }
  };

  const importSelected = () => {
    let added = 0;
    const skipped: string[] = [];
    rows.forEach((row, index) => {
      const on = checked[index] ?? row.status === "nuevo";
      if (!on || row.status !== "nuevo") return;
      const result = addPerson({
        fullName: row.fullName,
        documentId: row.documentId,
        phone: row.phone,
        position: (row.position || "universal") as Position,
        notes: "",
        tags: [],
      });
      if (result.ok) added += 1;
      else skipped.push(row.fullName);
    });
    if (!added && !skipped.length) {
      toast.error("No hay filas nuevas seleccionadas.");
      return;
    }
    if (skipped.length) toast.error(`Se guardaron ${added}. ${skipped.length} no pasaron la validación.`);
    else toast.success(added === 1 ? "Se guardó 1 compañero" : `Se guardaron ${added} compañeros`);
    if (added) {
      setText("");
      setChecked({});
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Importar compañeros">
      <p className="mb-3 text-sm text-muted">
        Una persona por línea: Nombre, identificación, celular opcional. También puedes pegar un CSV. No se guardan fotos.
      </p>
      <TextArea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setChecked({});
        }}
        placeholder={"Ana Ríos, 1234567890, 3001234567\nCamilo Herrera; 1098765432"}
      />
      <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-bg px-3 text-sm font-medium">
        Elegir archivo TXT o CSV
        <input
          type="file"
          accept=".txt,.csv,.tsv,text/plain,text/csv"
          className="sr-only"
          onChange={(e) => void loadFile(e.target.files?.[0])}
        />
      </label>
      {rows.length ? (
        <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
          {rows.map((row, index) => {
            const on = checked[index] ?? row.status === "nuevo";
            return (
              <li key={`${row.line}-${index}`} className="flex items-start gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  disabled={row.status !== "nuevo"}
                  checked={row.status === "nuevo" && on}
                  onChange={(e) => setChecked({ ...checked, [index]: e.target.checked })}
                />
                <div className="min-w-0">
                  <p className="font-medium">{row.fullName || "Sin nombre"}</p>
                  <p className="text-muted">
                    {row.status === "nuevo" && "Nuevo"}
                    {row.status === "duplicado" && "Duplicado: no se vuelve a guardar"}
                    {row.status === "invalido" && (row.error ?? "Inválido")}
                    {row.documentId ? ` · ${row.documentId}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Button className="mt-4 w-full" onClick={importSelected} disabled={!rows.some((r) => r.status === "nuevo")}>
        Importar seleccionados
      </Button>
    </Modal>
  );
}
