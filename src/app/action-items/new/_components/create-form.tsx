"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createActionItem } from "@/lib/actions";
import type { Client } from "@/lib/schemas";

type State = Awaited<ReturnType<typeof createActionItem>> | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  return createActionItem(formData);
}

export function CreateActionItemForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<State, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Action item created");
      router.push("/action-items");
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Follow up on contract" required />
        {fieldErrors.title && (
          <p className="text-xs text-destructive">{fieldErrors.title.join(", ")}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          placeholder="What needs to happen?"
          required
        />
        {fieldErrors.description && (
          <p className="text-xs text-destructive">{fieldErrors.description.join(", ")}</p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="client_id">Client</Label>
          <Select name="client_id" required>
            <SelectTrigger id="client_id">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name ?? `Client #${c.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.client_id && (
            <p className="text-xs text-destructive">{fieldErrors.client_id.join(", ")}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select name="priority" defaultValue="low" required>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="critical"
          className="size-4 rounded border-input"
        />
        Mark as critical
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create action item"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
