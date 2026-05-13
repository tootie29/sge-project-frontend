"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/schemas";

const ALL = "__all__";

export function ListControls({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const clientId = params.get("client_id") ?? ALL;

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function pushParams(next: Record<string, string | null>) {
    const url = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") url.delete(key);
      else url.set(key, value);
    }
    url.delete("page");
    startTransition(() => router.replace(`/action-items?${url.toString()}`));
  }

  function onSubmitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    pushParams({ q: q.trim() || null });
  }

  function onChangeClient(value: string | null) {
    if (!value || value === ALL) pushParams({ client_id: null });
    else pushParams({ client_id: value });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.replace("/action-items"));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <form onSubmit={onSubmitSearch} className="flex-1">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Search title
        </label>
        <Input
          placeholder="e.g. meeting"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      <div className="w-full sm:w-60">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Client
        </label>
        <Select value={clientId} onValueChange={onChangeClient}>
          <SelectTrigger>
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name ?? `Client #${c.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="button" variant="ghost" onClick={clearAll}>
        Clear
      </Button>
    </div>
  );
}
