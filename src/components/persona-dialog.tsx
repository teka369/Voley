import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Field, Modal, SelectInput, TextArea, TextInput, useConfirm } from "@/components/ui";
import {
  POSITIONS,
  personConflict,
  type Person,
  type PersonInput,
  type Position,
} from "@/lib/domain";
import { useVm } from "@/lib/store";

const empty: PersonInput = {
  fullName: "",
  documentId: "",
  phone: "",
  position: "universal",
  notes: "",
  tags: [],
  isDemo: false,
};

export function PersonaDialog({
  open,
  onOpenChange,
  person,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person | null;
  onSaved?: (id: string) => void;
}) {
  const people = useVm((s) => s.people);
  const addPerson = useVm((s) => s.addPerson);
  const updatePerson = useVm((s) => s.updatePerson);
  const confirm = useConfirm();
  const [form, setForm] = useState<PersonInput>(empty);
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (person) {
      setForm({
        fullName: person.fullName,
        documentId: person.documentId,
        phone: person.phone,
        position: person.position,
        notes: person.notes,
        tags: person.tags,
        isDemo: person.isDemo,
      });
      setTags(person.tags.join(", "));
    } else {
      setForm(empty);
      setTags("");
    }
  }, [open, person]);

  const save = async () => {
    const input: PersonInput = {
      ...form,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    const conflict = personConflict(people, { ...input, id: person?.id });
    if (conflict.byName) {
      const ok = await confirm({
        title: "Hay alguien con el mismo nombre",
        body: `${conflict.byName.fullName} ya está en el directorio, con otra identificación. ¿Guardar de todas formas?`,
        confirmLabel: "Guardar",
      });
      if (!ok) return;
    }
    const result = person ? updatePerson(person.id, input) : addPerson(input);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(person ? "Compañero actualizado" : "Compañero guardado");
    onOpenChange(false);
    onSaved?.(result.id);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={person ? "Editar compañero" : "Nuevo compañero"}>
      <div className="grid gap-3">
        <Field label="Nombre completo">
          <TextInput value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
        </Field>
        <Field label="Identificación" hint="Cédula, cédula de extranjería o PPT. Sin puntos.">
          <TextInput
            value={form.documentId}
            onChange={(e) => setForm({ ...form, documentId: e.target.value })}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
        <Field label="Celular" hint="Opcional">
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
        <Field label="Posición">
          <SelectInput
            value={form.position}
            onChange={(e) => setForm({ ...form, position: e.target.value as Position })}
          >
            {POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Etiquetas" hint="Separadas por coma. Ejemplo: titular, conductor">
          <TextInput value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Field label="Observaciones">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(form.isDemo)}
            onChange={(e) => setForm({ ...form, isDemo: e.target.checked })}
          />
          Marcar como dato de prueba
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button onClick={() => void save()}>{person ? "Guardar cambios" : "Guardar compañero"}</Button>
      </div>
    </Modal>
  );
}
