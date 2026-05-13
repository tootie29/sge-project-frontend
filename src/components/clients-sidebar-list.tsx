"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LifeBuoy, LogOut, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Client } from "@/lib/schemas";
import { buttonVariants } from "@/components/ui/button";

const TAB_ROUTES = new Set([
  "/business-intelligence",
  "/action-items",
  "/rank-tracker",
  "/website-status",
]);

export function ClientsSidebarList({ clients }: { clients: Client[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("client_id");
  // If we already have a client selected and we're on a tab route, keep the
  // current tab when switching clients. Otherwise (first selection from a
  // global view) land on Business Intelligence.
  const targetPath =
    selected && TAB_ROUTES.has(pathname) ? pathname : "/business-intelligence";

  const [filter, setFilter] = useState("");
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q),
    );
  }, [filter, clients]);

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search clients..."
          className="pl-7"
        />
      </div>

      <Link
        href="/action-items/new"
        className={buttonVariants({ variant: "default", size: "sm" })}
      >
        <Plus className="size-3.5" />
        New Entry
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {filtered.length === 0 && (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            {clients.length === 0 ? "No clients loaded." : "No matches."}
          </li>
        )}
        {filtered.map((client) => {
          const active = selected === String(client.id);
          return (
            <li key={client.id}>
              <Link
                href={`${targetPath}?client_id=${client.id}`}
                className={
                  "block rounded-md px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                }
              >
                {client.name ?? `Client #${client.id}`}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        <Link
          href="#"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          <LifeBuoy className="size-4" />
          Support
        </Link>
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        >
          <LogOut className="size-4" />
          Logout
        </Link>
      </div>
    </div>
  );
}
