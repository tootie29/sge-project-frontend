import { TerminalSquare } from "lucide-react";

export const metadata = { title: "SGE CRM — Enterprise Node" };

export default function Home() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md space-y-3 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-primary/15 text-primary">
          <TerminalSquare className="size-6" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight">SGE CRM</h1>
        <p className="text-muted-foreground">
          Pick a client from the sidebar to view their Business Intelligence,
          Action Items, Rank Tracker, and Website Status.
        </p>
      </div>
    </div>
  );
}
