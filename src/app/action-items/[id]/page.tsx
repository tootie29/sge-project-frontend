import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CriticalBadge,
  PriorityBadge,
  StatusBadge,
} from "../_components/priority-badge";
import { EditPanel } from "./_components/edit-panel";
import { CommentsPanel } from "./_components/comments-panel";

export const dynamic = "force-dynamic";

export default async function ActionItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const [itemResult, commentsResult] = await Promise.allSettled([
    api.actionItems.get(id),
    api.comments.list(id),
  ]);

  const item = itemResult.status === "fulfilled" ? itemResult.value : null;
  const comments = commentsResult.status === "fulfilled" ? commentsResult.value : [];

  if (itemResult.status === "rejected") {
    const reason = itemResult.reason;
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load action item.
        {reason instanceof ApiError && ` Backend error (${reason.status}).`}
      </div>
    );
  }

  if (!item) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/action-items"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          ← Back to list
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{item.title ?? "(untitled)"}</CardTitle>
              <CardDescription>
                <span className="font-mono text-xs">#{item.id}</span>
                {item.client ? ` · Client: ${item.client.name ?? `#${item.client.id}`}` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
              <CriticalBadge critical={item.critical} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm">{item.description ?? "—"}</p>
          <EditPanel item={item} />
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Comments</h2>
        <CommentsPanel actionItemId={item.id} comments={comments} />
      </section>
    </div>
  );
}
