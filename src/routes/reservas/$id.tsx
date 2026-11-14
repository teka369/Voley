import { createFileRoute } from "@tanstack/react-router";
import { ReservaView } from "@/components/reserva-view";
import { LoadingBlock } from "@/components/ui";
import { useHydrated } from "@/lib/store";

const TABS = ["equipo", "pagos", "documentos", "cambios"] as const;
type TabId = (typeof TABS)[number];

export const Route = createFileRoute("/reservas/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: TabId } => ({
    tab: TABS.includes(search.tab as TabId) ? (search.tab as TabId) : undefined,
  }),
  component: Detalle,
});

function Detalle() {
  const hydrated = useHydrated();
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  if (!hydrated) return <LoadingBlock />;
  return <ReservaView id={id} initialTab={tab} />;
}
