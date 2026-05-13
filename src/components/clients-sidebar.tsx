import { api } from "@/lib/api";
import { ClientsSidebarList } from "./clients-sidebar-list";

export async function ClientsSidebar() {
  let clients: Awaited<ReturnType<typeof api.clients.all>> = [];
  try {
    clients = await api.clients.all();
  } catch {
    // backend down — sidebar still renders, just empty
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Clients List
        </h2>
        <p className="text-xs text-muted-foreground">Enterprise Node</p>
      </div>
      <ClientsSidebarList clients={clients} />
    </aside>
  );
}
