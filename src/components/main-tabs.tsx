"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const tabs = [
  { href: "/business-intelligence", label: "Business Intelligence" },
  { href: "/action-items", label: "Action Items" },
  { href: "/rank-tracker", label: "Rank Tracker" },
  { href: "/website-status", label: "Website Status" },
];

export function MainTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  const clientId = params.get("client_id");

  if (!clientId) return null;
  const suffix = `?client_id=${clientId}`;

  return (
    <nav className="flex gap-6 border-b border-border px-1">
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={`${tab.href}${suffix}`}
            className={
              "relative -mb-px border-b-2 py-3 text-base transition-colors " +
              (active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
