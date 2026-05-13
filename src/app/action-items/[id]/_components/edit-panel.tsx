"use client";

import { useActionState, useEffect, useState } from "react";
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
import { updateActionItem, deleteActionItem } from "@/lib/actions";
import type { ActionItem } from "@/lib/schemas";

type State = Awaited<ReturnType<typeof updateActionItem>> | null;

export function EditPanel({ item }: { item: ActionItem }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, fd) => updateActionItem(item.id, fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Action item updated");
      setOpen(false);
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel edit" : "Edit"}
        </Button>
        <form action={deleteActionItem.bind(null, item.id)}>
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            onClick={(e) => {
              if (!confirm("Delete this action item? This cannot be undone.")) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </Button>
        </form>
      </div>

      {open && (
        <form action={formAction} className="space-y-4 rounded-md border p-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" name="title" defaultValue={item.title ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              rows={4}
              defaultValue={item.description ?? ""}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select name="priority" defaultValue={item.priority ?? "low"}>
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select name="status" defaultValue={item.status ?? "pending"}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="critical"
              defaultChecked={!!item.critical}
              className="size-4 rounded border-input"
            />
            Critical
          </label>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}
    </div>
  );
}
