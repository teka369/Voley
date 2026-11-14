import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import { formatDocList, type DocRow } from "@/lib/domain";
import { copyText, docTable, downloadPdf, downloadText, safeFile, toCsv, toExcelXml } from "@/lib/exporters";

export function DocPanel({
  rows,
  filename,
  selectAll = false,
  title = "Vista previa",
}: {
  rows: DocRow[];
  filename: string;
  selectAll?: boolean;
  title?: string;
}) {
  const signature = rows.map((r) => r.personId).join("|");
  const [picked, setPicked] = useState<string[]>(() => (selectAll ? rows.map((r) => r.personId) : []));
  const [mode, setMode] = useState<"ids" | "names">("ids");

  useEffect(() => {
    setPicked(selectAll ? rows.map((r) => r.personId) : []);
    // The signature captures the current roster without retriggering on row object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, selectAll]);

  const selected = useMemo(() => rows.filter((r) => picked.includes(r.personId)), [rows, picked]);
  const preview = selected.length ? formatDocList(selected, mode) : "";
  const base = safeFile(filename);

  const toggle = (id: string) => {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const copy = async () => {
    if (!preview) return;
    const ok = await copyText(preview);
    if (ok) toast.success(mode === "ids" ? `Se copiaron ${selected.length} identificaciones` : "Lista copiada");
    else toast.error("No se pudo copiar. Selecciona el texto de la vista previa.");
  };

  const download = (kind: "txt" | "csv" | "xls" | "pdf") => {
    if (!selected.length) return;
    let ok = false;
    if (kind === "txt") ok = downloadText(`${base}.txt`, preview, "text/plain;charset=utf-8");
    if (kind === "csv") ok = downloadText(`${base}.csv`, toCsv(docTable(selected)), "text/csv;charset=utf-8");
    if (kind === "xls") {
      ok = downloadText(`${base}.xls`, toExcelXml(docTable(selected)), "application/vnd.ms-excel");
    }
    if (kind === "pdf") ok = downloadPdf(`${base}.pdf`, "Documentos del encuentro", preview.split("\n"));
    if (ok) toast.success("Archivo descargado");
    else toast.error("No se pudo descargar el archivo.");
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPicked(rows.map((r) => r.personId))} disabled={!rows.length}>
          Seleccionar todos
        </Button>
        <Button variant="ghost" onClick={() => setPicked([])} disabled={!picked.length}>
          Limpiar
        </Button>
      </div>
      <ul className="grid gap-2">
        {rows.map((row) => (
          <li key={row.personId}>
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
              <input
                type="checkbox"
                className="size-5"
                checked={picked.includes(row.personId)}
                onChange={() => toggle(row.personId)}
              />
              <span className="min-w-0">
                <span className="block font-medium">{row.name}</span>
                <span className="block text-sm tabular-nums text-muted">{row.doc}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{title}</h2>
          <div className="flex rounded-xl bg-surface-2 p-1">
            <button
              type="button"
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${mode === "ids" ? "bg-surface" : ""}`}
              onClick={() => setMode("ids")}
            >
              Solo números
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-lg px-3 text-sm font-medium ${mode === "names" ? "bg-surface" : ""}`}
              onClick={() => setMode("names")}
            >
              Nombre y documento
            </button>
          </div>
        </div>
        <pre className="max-h-56 overflow-auto rounded-xl bg-bg p-3 text-sm whitespace-pre-wrap tabular-nums">
          {preview || "Selecciona personas para ver exactamente lo que se va a copiar."}
        </pre>
        <p className="mt-2 text-xs text-muted">
          {selected.length
            ? `${selected.length} ${selected.length === 1 ? "documento" : "documentos"} en la vista previa.`
            : "Nada seleccionado."}{" "}
          Revisa antes de copiar o exportar.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void copy()} disabled={!preview}>
            Copiar
          </Button>
          <Button variant="secondary" onClick={() => download("txt")} disabled={!preview}>
            TXT
          </Button>
          <Button variant="secondary" onClick={() => download("csv")} disabled={!preview}>
            CSV
          </Button>
          <Button variant="secondary" onClick={() => download("xls")} disabled={!preview}>
            Excel
          </Button>
          <Button variant="secondary" onClick={() => download("pdf")} disabled={!preview}>
            PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
