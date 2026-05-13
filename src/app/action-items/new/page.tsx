import { api, ApiError } from "@/lib/api";
import { CreateActionItemForm } from "./_components/create-form";

export const dynamic = "force-dynamic";

export default async function NewActionItemPage() {
  let clients: Awaited<ReturnType<typeof api.clients.all>> = [];
  let error: string | null = null;

  try {
    clients = await api.clients.all();
  } catch (e) {
    error = e instanceof ApiError ? `Backend error (${e.status})` : "Failed to load clients";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New action item</h1>
        <p className="text-sm text-muted-foreground">
          Create a new action item and assign it to a client.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <CreateActionItemForm clients={clients} />
    </div>
  );
}
