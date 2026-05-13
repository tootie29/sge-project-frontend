import { api } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business Intelligence · SGE CRM" };

type SearchParams = { client_id?: string };

export default async function BusinessIntelligencePage({
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
      <h1 className="text-3xl font-bold tracking-tight">Business Intelligence</h1>
      <p className="text-sm text-muted-foreground">
        {clientName
          ? `Insights for ${clientName}.`
          : "Pick a client from the sidebar to view their insights."}
      </p>
      <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        Not wired to the backend yet. The backend exposes a stub at{" "}
        <code className="text-primary">DB_business_intelligence</code> in{" "}
        <code className="text-primary">database.py</code> targeting the{" "}
        <code className="text-primary">insights_v2</code> table — endpoints
        still need to be added before this view can render real data per client.
      </div>
    </div>
  );
}
