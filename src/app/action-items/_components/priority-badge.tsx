import { Badge } from "@/components/ui/badge";

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

export function PriorityBadge({ priority }: { priority?: string | null }) {
  const key = (priority ?? "").toLowerCase();
  const variant = priorityVariant[key] ?? "outline";
  return <Badge variant={variant}>{priority ?? "—"}</Badge>;
}

export function StatusBadge({ status }: { status?: string | null }) {
  return <Badge variant="outline">{status ?? "—"}</Badge>;
}

export function CriticalBadge({ critical }: { critical?: boolean | null }) {
  if (!critical) return null;
  return <Badge variant="destructive">CRITICAL</Badge>;
}
