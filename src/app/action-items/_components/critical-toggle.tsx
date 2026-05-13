"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type CriticalFilter = "critical" | "regular";

export function CriticalToggle({ value }: { value: CriticalFilter }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function setValue(next: CriticalFilter) {
    const url = new URLSearchParams(params.toString());
    url.set("filter", next);
    startTransition(() => router.replace(`/action-items?${url.toString()}`));
  }

  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {(["critical", "regular"] as const).map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setValue(option)}
            className={
              "rounded-sm px-3 py-1 text-xs font-semibold capitalize transition-colors " +
              (active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
