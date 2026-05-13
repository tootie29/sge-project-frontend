import Link from "next/link";
import { Bell, Settings, TerminalSquare } from "lucide-react";

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/60 px-6">
      <Link href="/action-items" className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-primary/15 text-primary">
          <TerminalSquare className="size-5" />
        </span>
        <span className="text-lg font-bold tracking-wider text-primary">SGE CRM</span>
      </Link>
      <div className="flex items-center gap-3">
        <button
          aria-label="Notifications"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>
        <Link
          href="/clients"
          aria-label="Settings"
          className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="size-4" />
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Login / Logout
        </Link>
      </div>
    </header>
  );
}
