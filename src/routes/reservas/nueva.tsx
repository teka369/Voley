import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ReservaForm } from "@/components/reserva-form";
import { LoadingBlock, Page } from "@/components/ui";
import { blankReservation } from "@/lib/domain";
import { useHydrated, useVm } from "@/lib/store";

export const Route = createFileRoute("/reservas/nueva")({ component: Nueva });

function Nueva() {
  const hydrated = useHydrated();
  const prefs = useVm((s) => s.prefs);
  const addReservation = useVm((s) => s.addReservation);
  const navigate = useNavigate();
  if (!hydrated) return <LoadingBlock />;
  return (
    <Page title="Nueva reserva" lede="Escenario, fecha y cupos alcanzan para empezar. Lo demás se completa después.">
      <ReservaForm
        initial={blankReservation(prefs)}
        submitLabel="Crear reserva"
        onSubmit={(input, force) => {
          const result = addReservation(input, { force });
          if (result.ok) {
            toast.success("Reserva creada");
            void navigate({ to: "/reservas/$id", params: { id: result.id } });
          }
          return result;
        }}
      />
    </Page>
  );
}
