"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  CreateActionItemSchema,
  PostCommentSchema,
  PostSubCommentSchema,
  UpdateActionItemSchema,
} from "@/lib/schemas";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function err(message: string): ActionResult<never> {
  return { ok: false, error: message };
}

function apiErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: string; message?: string } | string | null;
    if (typeof body === "string") return body;
    if (body?.detail) return body.detail;
    if (body?.message) return body.message;
    return `Backend error (${e.status})`;
  }
  return e instanceof Error ? e.message : "Unknown error";
}

export async function createActionItem(formData: FormData): Promise<ActionResult<{ id?: number }>> {
  const parsed = CreateActionItemSchema.safeParse({
    client_id: formData.get("client_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    critical: formData.get("critical") === "on" || formData.get("critical") === "true",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: z_flatten(parsed.error),
    };
  }

  try {
    const result = (await api.actionItems.create(parsed.data)) as { id?: number };
    revalidatePath("/action-items");
    return { ok: true, data: result ?? {} };
  } catch (e) {
    return err(apiErrorMessage(e));
  }
}

export async function updateActionItem(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const raw: Record<string, unknown> = {};
  const title = formData.get("title");
  const description = formData.get("description");
  const priority = formData.get("priority");
  const status = formData.get("status");
  const critical = formData.get("critical");

  if (typeof title === "string" && title.length > 0) raw.title = title;
  if (typeof description === "string" && description.length > 0) raw.description = description;
  if (typeof priority === "string" && priority.length > 0) raw.priority = priority;
  if (typeof status === "string" && status.length > 0) raw.status = status;
  if (critical !== null) raw.critical = critical === "on" || critical === "true";

  const parsed = UpdateActionItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: z_flatten(parsed.error) };
  }

  try {
    await api.actionItems.update(id, parsed.data);
    revalidatePath(`/action-items/${id}`);
    revalidatePath("/action-items");
    return { ok: true, data: null };
  } catch (e) {
    return err(apiErrorMessage(e));
  }
}

export async function deleteActionItem(id: number): Promise<void> {
  try {
    await api.actionItems.remove(id);
  } catch (e) {
    throw new Error(apiErrorMessage(e));
  }
  revalidatePath("/action-items");
  redirect("/action-items");
}

export async function postComment(formData: FormData): Promise<ActionResult> {
  const parsed = PostCommentSchema.safeParse({
    action_item: Number(formData.get("action_item")),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: z_flatten(parsed.error) };
  }

  try {
    await api.comments.post(parsed.data);
    revalidatePath(`/action-items/${parsed.data.action_item}`);
    return { ok: true, data: null };
  } catch (e) {
    return err(apiErrorMessage(e));
  }
}

export async function getCommentThread(parentId: number) {
  try {
    return { ok: true as const, data: await api.comments.thread(parentId) };
  } catch (e) {
    return { ok: false as const, error: apiErrorMessage(e) };
  }
}

export async function postSubComment(
  actionItemId: number,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = PostSubCommentSchema.safeParse({
    comment_parent: Number(formData.get("comment_parent")),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Validation failed", fieldErrors: z_flatten(parsed.error) };
  }

  try {
    await api.comments.postSub(parsed.data);
    revalidatePath(`/action-items/${actionItemId}`);
    return { ok: true, data: null };
  } catch (e) {
    return err(apiErrorMessage(e));
  }
}

function z_flatten(err: import("zod").ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.map(String).join(".") || "_";
    out[key] = out[key] ?? [];
    out[key].push(issue.message);
  }
  return out;
}
