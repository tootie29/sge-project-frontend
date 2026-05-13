import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rank Tracker · SGE CRM" };

type SearchParams = { client_id?: string };

export default async function RankTrackerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const clientId = sp.client_id ? Number(sp.client_id) : null;

  let clientName: string | null = null;
  if (clientId) {
    try {
      const all = await api.clients.all();
      clientName = all.find((c) => c.id === clientId)?.name ?? `Client #${clientId}`;
    } catch {
      clientName = `Client #${clientId}`;
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight">Rank Tracker</h1>
      <p className="text-sm text-muted-foreground">
        {clientName
          ? `Keyword rankings for ${clientName}.`
          : "Pick a client from the sidebar to view their keyword rankings."}
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Not wired to the backend yet — there is no rank tracker table or
        endpoint in the FastAPI app. This stub is a placeholder so the tab nav
        has somewhere to go.
      </div>
    </div>
  );
}
