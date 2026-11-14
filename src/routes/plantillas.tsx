import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Field, LoadingBlock, Page, SelectInput, TextArea, TextInput, useConfirm } from "@/components/ui";
import {
  isoDate,
  isUpcoming,
  renderTemplate,
  TEMPLATE_LABEL,
  TEMPLATE_VARS,
  templateVars,
  type Template,
  type TemplateKind,
} from "@/lib/domain";
import { copyText } from "@/lib/exporters";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/plantillas")({
  validateSearch: (search: Record<string, unknown>): { encuentro?: string } => ({
    encuentro: typeof search.encuentro === "string" ? search.encuentro : undefined,
  }),
  component: Plantillas,
});

function Plantillas() {
  const hydrated = useHydrated();
  const { encuentro } = Route.useSearch();
  const templates = useVm((s) => s.templates);
  const reservations = useVm((s) => s.reservations);
  const people = useVm((s) => s.people);
  const prefs = useVm((s) => s.prefs);
  const saveTemplate = useVm((s) => s.saveTemplate);
  const duplicateTemplate = useVm((s) => s.duplicateTemplate);
  const deleteTemplate = useVm((s) => s.deleteTemplate);
  const resetTemplates = useVm((s) => s.resetTemplates);
  const confirm = useConfirm();
  const area = useRef<HTMLTextAreaElement>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<TemplateKind>("invitacion");
  const [body, setBody] = useState("");
  const [resId, setResId] = useState(encuentro ?? "");

  useEffect(() => {
    if (!hydrated || currentId || !templates[0]) return;
    load(templates[0]);
  }, [hydrated, templates, currentId]);

  useEffect(() => {
    if (encuentro) setResId(encuentro);
  }, [encuentro]);

  const current = templates.find((t) => t.id === currentId) ?? null;
  const today = isoDate(new Date());
  const choices = useMemo(
    () =>
      [...reservations].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)),
    [reservations],
  );
  const selected = choices.find((r) => r.id === resId) ?? choices.find((r) => isUpcoming(r, today));
  const preview = renderTemplate(body, templateVars(selected, people, prefs));

  function load(t: Template) {
    setCurrentId(t.id);
    setName(t.name);
    setKind(t.kind);
    setBody(t.body);
  }

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const el = area.current;
    if (!el) {
      setBody((b) => `${b}${token}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? start;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  if (!hydrated) return <LoadingBlock />;

  return (
    <Page
      title="Plantillas"
      lede="Mensajes listos para WhatsApp, con la fecha, el escenario y los nombres del encuentro."
      actions={
        <Button
          variant="secondary"
          onClick={() => {
            setCurrentId(null);
            setName("Nueva plantilla");
            setKind("personalizado");
            setBody("Hola.\n\n{{fecha}} · {{escenario}}\n");
          }}
        >
          Nueva
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="grid gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => load(t)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm ${t.id === currentId ? "border-primary bg-primary-soft" : "border-line bg-surface"}`}
            >
              <span className="block font-semibold">{t.name}</span>
              <span className="text-muted">{TEMPLATE_LABEL[t.kind]}</span>
            </button>
          ))}
          <Button variant="ghost" onClick={() => { resetTemplates(); toast.success("Plantillas base restauradas"); }}>
            Restaurar base
          </Button>
        </div>
        <div className="grid gap-3">
          <Card>
            <div className="grid gap-3">
              <Field label="Nombre">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Tipo">
                <SelectInput value={kind} onChange={(e) => setKind(e.target.value as TemplateKind)}>
                  {(Object.keys(TEMPLATE_LABEL) as TemplateKind[]).map((k) => (
                    <option key={k} value={k}>{TEMPLATE_LABEL[k]}</option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Encuentro para rellenar variables">
                <SelectInput value={selected?.id ?? ""} onChange={(e) => setResId(e.target.value)}>
                  <option value="">Sin encuentro</option>
                  {choices.map((r) => (
                    <option key={r.id} value={r.id}>{r.date} · {r.venue}</option>
                  ))}
                </SelectInput>
              </Field>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_VARS.map((v) => (
                  <button key={v.key} type="button" className="min-h-11 rounded-xl bg-surface-2 px-3 text-sm" onClick={() => insert(v.key)}>
                    {v.label}
                  </button>
                ))}
              </div>
              <TextArea ref={area} value={body} onChange={(e) => setBody(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const result = saveTemplate({ id: currentId ?? undefined, name, kind, body });
                    if (!result.ok) toast.error(result.error);
                    else {
                      setCurrentId(result.id);
                      toast.success("Plantilla guardada");
                    }
                  }}
                >
                  Guardar
                </Button>
                {current ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const result = duplicateTemplate(current.id);
                      if (!result.ok) toast.error(result.error);
                      else {
                        const copy = useVm.getState().templates.find((t) => t.id === result.id);
                        if (copy) load(copy);
                        toast.success("Plantilla duplicada");
                      }
                    }}
                  >
                    Duplicar
                  </Button>
                ) : null}
                {current ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      void confirm({
                        title: "¿Eliminar esta plantilla?",
                        body: "Puedes restaurar las plantillas base después.",
                        confirmLabel: "Eliminar",
                        danger: true,
                      }).then((ok) => {
                        if (!ok || !current) return;
                        deleteTemplate(current.id);
                        setCurrentId(null);
                        toast.success("Plantilla eliminada");
                      });
                    }}
                  >
                    Eliminar
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold">Vista previa</h2>
            <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-bg p-3 text-sm whitespace-pre-wrap">{preview || "Escribe el mensaje para verlo."}</pre>
            <Button
              className="mt-3"
              disabled={!preview.trim()}
              onClick={() => void copyText(preview).then((ok) => (ok ? toast.success("Mensaje copiado") : toast.error("No se pudo copiar")))}
            >
              Copiar mensaje
            </Button>
          </Card>
        </div>
      </div>
    </Page>
  );
}
