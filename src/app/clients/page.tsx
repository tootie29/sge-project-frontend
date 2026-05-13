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
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  let clients = [] as Awaited<ReturnType<typeof api.clients.all>>;
  let error: string | null = null;

  try {
    clients = await api.clients.all();
  } catch (e) {
    error = e instanceof ApiError ? `Backend error (${e.status})` : "Failed to load clients";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-sm text-muted-foreground">
          All clients registered across the enterprise node.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-40 text-right">Action items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No clients yet.
                </TableCell>
              </TableRow>
            )}
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-xs">{client.id}</TableCell>
                <TableCell className="font-medium">{client.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/action-items?client_id=${client.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    View items
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
