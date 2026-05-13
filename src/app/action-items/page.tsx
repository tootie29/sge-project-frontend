import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "./_components/pagination";
import { CriticalToggle, type CriticalFilter } from "./_components/critical-toggle";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  client_id?: string;
  page?: string;
  limit?: string;
  order?: string;
  filter?: string;
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-destructive/40 bg-destructive/15 text-destructive",
  medium: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  low: "border-sky-500/40 bg-sky-500/15 text-sky-300",
};

const STATUS_STYLES: Record<string, string> = {
  in_progress: "border-primary/40 bg-primary/15 text-primary",
  ongoing: "border-primary/40 bg-primary/15 text-primary",
  pending: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  pending_review_process: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  requested: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  scheduled: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  completed: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

function pillClass(table: Record<string, string>, key?: string | null) {
  const k = (key ?? "").toLowerCase().replace(/\s+/g, "_");
  return (
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs " +
    (table[k] ?? "border-border bg-muted text-muted-foreground")
  );
}

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(sp.limit ?? "10", 10) || 10));
  const order = (sp.order === "asc" ? "asc" : "desc") as "asc" | "desc";
  const q = sp.q?.trim();
  const clientId = sp.client_id ? Number(sp.client_id) : undefined;
  const filter: CriticalFilter = sp.filter === "regular" ? "regular" : "critical";

  const [itemsResult, clientsResult] = await Promise.allSettled([
    q
      ? api.actionItems.search(q, { page, limit, order })
      : clientId
        ? api.actionItems.byClient(clientId, { page, limit, order })
        : api.actionItems.list({ page, limit, order }),
    clientId ? api.clients.all() : Promise.resolve([]),
  ]);

  const items = itemsResult.status === "fulfilled" ? itemsResult.value : [];
  const error =
    itemsResult.status === "rejected"
      ? itemsResult.reason instanceof ApiError
        ? `Backend error (${itemsResult.reason.status})`
        : "Failed to load action items"
      : null;
  const clientName =
    clientId && clientsResult.status === "fulfilled"
      ? clientsResult.value.find((c) => c.id === clientId)?.name ?? `Client #${clientId}`
      : null;

  const visible = items.filter((item) =>
    filter === "critical" ? !!item.critical : !item.critical,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Action Items</h1>
          <p className="text-sm text-muted-foreground">
            {clientName
              ? `Tasks for ${clientName}.`
              : "Manage and monitor high-priority operational tasks across the terminal node."}
          </p>
        </div>
        <CriticalToggle value={filter} />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:tracking-widest [&_th]:uppercase">
              <TableHead className="w-44">Datetime</TableHead>
              <TableHead className="w-28">Priority</TableHead>
              <TableHead className="w-36">Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-24 text-right">Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No {filter} action items.
                </TableCell>
              </TableRow>
            )}
            {visible.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/40">
                <TableCell className="text-xs text-muted-foreground">—</TableCell>
                <TableCell>
                  <span className={pillClass(PRIORITY_STYLES, item.priority)}>
                    {item.priority ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={pillClass(STATUS_STYLES, item.status)}>
                    {item.status?.replace(/_/g, " ") ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/action-items/${item.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {item.title ?? "(untitled)"}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {item.critical ? (
                    <Badge variant="destructive">CRITICAL</Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} limit={limit} hasMore={items.length === limit} />
    </div>
  );
}
