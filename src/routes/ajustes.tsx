import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Card, Field, LoadingBlock, Page, TextInput, useConfirm } from "@/components/ui";
import { parseBackup, serializeBackup, type ThemeMode } from "@/lib/domain";
import { downloadText } from "@/lib/exporters";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/ajustes")({ component: Ajustes });

function Ajustes() {
  const hydrated = useHydrated();
  const prefs = useVm((s) => s.prefs);
  const setPrefs = useVm((s) => s.setPrefs);
  const people = useVm((s) => s.people);
  const reservations = useVm((s) => s.reservations);
  const replaceAll = useVm((s) => s.replaceAll);
  const mergeAll = useVm((s) => s.mergeAll);
  const loadDemo = useVm((s) => s.loadDemo);
  const clearDemo = useVm((s) => s.clearDemo);
  const clearAll = useVm((s) => s.clearAll);
  const confirm = useConfirm();
  const [paste, setPaste] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [phrase, setPhrase] = useState("");
  if (!hydrated) return <LoadingBlock />;

  const demoCount = people.filter((p) => p.isDemo).length + reservations.filter((r) => r.isDemo).length;

  const stage = (raw: string) => {
    const parsed = parseBackup(raw);
    if (!parsed.ok) {
      setPending(null);
      setSummary("");
      toast.error(parsed.error);
      return;
    }
    setPending(raw);
    setSummary(`${parsed.data.people.length} compañeros, ${parsed.data.reservations.length} encuentros, ${parsed.data.templates.length} plantillas.`);
  };

  const apply = async (mode: "replace" | "merge") => {
    if (!pending) return;
    if (mode === "replace") {
      const ok = await confirm({
        title: "¿Reemplazar todos los datos?",
        body: "Lo que hay ahora en este dispositivo se sustituye por la copia. Exporta un respaldo antes si no estás seguro.",
        confirmLabel: "Reemplazar",
        danger: true,
      });
      if (!ok) return;
      const result = replaceAll(pending);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Copia restaurada");
        setPending(null);
        setPaste("");
      }
      return;
    }
    const result = mergeAll(pending);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.summary);
      setPending(null);
      setPaste("");
    }
  };

  return (
    <Page title="Ajustes" lede="Preferencias, copia de seguridad y datos de prueba. Todo queda en este navegador.">
      <div className="grid gap-4">
        <Card>
          <h2 className="font-semibold">Quién organiza</h2>
          <div className="mt-3 grid gap-3">
            <Field label="Tu nombre">
              <TextInput defaultValue={prefs.organizerName} onBlur={(e) => setPrefs({ organizerName: e.target.value.trim() })} />
            </Field>
            <Field label="Escenario habitual">
              <TextInput defaultValue={prefs.defaultVenue} onBlur={(e) => setPrefs({ defaultVenue: e.target.value.trim() })} />
            </Field>
            <Field label="Dirección habitual">
              <TextInput defaultValue={prefs.defaultAddress} onBlur={(e) => setPrefs({ defaultAddress: e.target.value.trim() })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cupos por defecto">
                <TextInput
                  inputMode="numeric"
                  defaultValue={String(prefs.defaultCapacity)}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 1 && n <= 40) setPrefs({ defaultCapacity: n });
                    else toast.error("Los cupos van de 1 a 40.");
                  }}
                />
              </Field>
              <Field label="Documentos por defecto">
                <TextInput
                  inputMode="numeric"
                  defaultValue={String(prefs.defaultRequiredDocs)}
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isInteger(n) && n >= 0 && n <= 40) setPrefs({ defaultRequiredDocs: n });
                    else toast.error("Los documentos van de 0 a 40.");
                  }}
                />
              </Field>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Apariencia</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["system", "Sistema"],
                ["light", "Claro"],
                ["dark", "Oscuro"],
              ] as [ThemeMode, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${prefs.theme === id ? "bg-primary text-primary-fg" : "bg-surface-2"}`}
                onClick={() => setPrefs({ theme: id })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs.maskDocuments}
              onChange={(e) => setPrefs({ maskDocuments: e.target.checked })}
            />
            Ocultar identificaciones en el directorio
          </label>
        </Card>
        <Card>
          <h2 className="font-semibold">Copia de seguridad</h2>
          <p className="mt-1 text-sm text-muted">
            El archivo incluye cédulas. Guárdalo en un lugar privado. Si cambias de celular, impórtalo aquí.
          </p>
          <Button
            className="mt-3"
            onClick={() => {
              const state = useVm.getState();
              const ok = downloadText(
                "volleymanager-copia.json",
                serializeBackup({
                  people: state.people,
                  reservations: state.reservations,
                  templates: state.templates,
                  prefs: state.prefs,
                }),
                "application/json",
              );
              if (ok) toast.success("Copia descargada");
              else toast.error("No se pudo descargar la copia.");
            }}
          >
            Exportar todo
          </Button>
          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-bg px-3 text-sm font-medium">
            Elegir archivo JSON
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                void file.text().then(stage).catch(() => toast.error("No se pudo leer el archivo."));
              }}
            />
          </label>
          <Field label="O pega la copia" hint="No se aplica hasta que elijas reemplazar o combinar.">
            <textarea
              className="min-h-28 w-full rounded-xl border border-line bg-bg px-3 py-3 text-sm"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
          </Field>
          <Button variant="secondary" className="mt-2" onClick={() => stage(paste)} disabled={!paste.trim()}>
            Revisar texto
          </Button>
          {summary ? <p className="mt-3 text-sm">{summary}</p> : null}
          {pending ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void apply("merge")}>Combinar</Button>
              <Button variant="danger" onClick={() => void apply("replace")}>
                Reemplazar todo
              </Button>
            </div>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-semibold">Datos de prueba</h2>
          <p className="mt-1 text-sm text-muted">
            El ejemplo usa nombres y cédulas ficticias, con la etiqueta Prueba. Borrarlo no toca tus datos reales.
            {demoCount ? ` Hay ${demoCount} registros de prueba.` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                const result = loadDemo();
                if (!result.ok) toast.error(result.error);
                else toast.success("Ejemplo cargado");
              }}
            >
              Cargar ejemplo
            </Button>
            <Button
              variant="ghost"
              disabled={!demoCount}
              onClick={() => {
                void confirm({
                  title: "¿Borrar los datos de prueba?",
                  body: "Se eliminan compañeros y encuentros marcados como prueba. Lo demás se queda.",
                  confirmLabel: "Borrar prueba",
                  danger: true,
                }).then((ok) => {
                  if (!ok) return;
                  clearDemo();
                  toast.success("Datos de prueba eliminados");
                });
              }}
            >
              Borrar prueba
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">Zona sensible</h2>
          <p className="mt-1 text-sm text-muted">Escribe BORRAR para vaciar compañeros, reservas y preferencias de este dispositivo.</p>
          <TextInput className="mt-3" value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="BORRAR" />
          <Button
            className="mt-3"
            variant="danger"
            disabled={phrase !== "BORRAR"}
            onClick={() => {
              void confirm({
                title: "¿Borrar todo?",
                body: "No hay papelera. Si no exportaste una copia, no se puede recuperar.",
                confirmLabel: "Borrar todo",
                danger: true,
              }).then((ok) => {
                if (!ok) return;
                clearAll();
                setPhrase("");
                toast.success("Datos borrados");
              });
            }}
          >
            Borrar todos los datos
          </Button>
        </Card>
      </div>
    </Page>
  );
}
