"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getCommentThread,
  postComment,
  postSubComment,
} from "@/lib/actions";
import type { Comment } from "@/lib/schemas";

type PostState = Awaited<ReturnType<typeof postComment>> | null;

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function ReplyForm({
  actionItemId,
  parentId,
  onSuccess,
}: {
  actionItemId: number;
  parentId: number;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<PostState, FormData>(
    async (_prev, fd) => postSubComment(actionItemId, fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Reply posted");
      onSuccess();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="mt-2 space-y-2">
      <input type="hidden" name="comment_parent" value={parentId} />
      <Textarea name="text" rows={2} placeholder="Write a reply…" required />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Posting…" : "Post reply"}
      </Button>
    </form>
  );
}

function CommentItem({
  comment,
  actionItemId,
}: {
  comment: Comment;
  actionItemId: number;
}) {
  const [thread, setThread] = useState<Comment[] | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [loading, startTransition] = useTransition();

  async function loadThread() {
    startTransition(async () => {
      const result = await getCommentThread(comment.id);
      if (result.ok) setThread(result.data);
      else toast.error(result.error);
    });
  }

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          #{comment.id} · {formatDate(comment.created_at)}
        </p>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{comment.text ?? ""}</p>

      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowReply((v) => !v)}
        >
          {showReply ? "Cancel" : "Reply"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadThread}
          disabled={loading}
        >
          {loading ? "Loading…" : thread === null ? "Show replies" : "Refresh replies"}
        </Button>
      </div>

      {showReply && (
        <ReplyForm
          actionItemId={actionItemId}
          parentId={comment.id}
          onSuccess={() => {
            setShowReply(false);
            loadThread();
          }}
        />
      )}

      {thread && thread.length > 0 && (
        <ul className="mt-3 space-y-2 border-l pl-4">
          {thread.map((reply) => (
            <li key={reply.id} className="rounded-md border bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">
                #{reply.id} · {formatDate(reply.created_at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{reply.text ?? ""}</p>
            </li>
          ))}
        </ul>
      )}
      {thread && thread.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">No replies yet.</p>
      )}
    </li>
  );
}

export function CommentsPanel({
  actionItemId,
  comments,
}: {
  actionItemId: number;
  comments: Comment[];
}) {
  const [state, formAction, pending] = useActionState<PostState, FormData>(
    async (_prev, fd) => postComment(fd),
    null,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Comment posted");
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-2 rounded-md border p-3">
        <input type="hidden" name="action_item" value={actionItemId} />
        <Textarea name="text" rows={3} placeholder="Add a comment…" required />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} actionItemId={actionItemId} />
          ))}
        </ul>
      )}
    </div>
  );
}
