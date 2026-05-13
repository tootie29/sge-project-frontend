"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";

export function Pagination({
  page,
  limit,
  hasMore,
}: {
  page: number;
  limit: number;
  hasMore: boolean;
}) {
  const params = useSearchParams();

  function hrefFor(nextPage: number) {
    const url = new URLSearchParams(params.toString());
    url.set("page", String(nextPage));
    url.set("limit", String(limit));
    return `/action-items?${url.toString()}`;
  }

  const prevDisabled = page <= 1;
  const nextDisabled = !hasMore;
  const base = buttonVariants({ variant: "outline", size: "sm" });
  const disabledCls = "pointer-events-none opacity-50";

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Page {page}</p>
      <div className="flex gap-2">
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={prevDisabled}
          className={`${base} ${prevDisabled ? disabledCls : ""}`}
        >
          Previous
        </Link>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={nextDisabled}
          className={`${base} ${nextDisabled ? disabledCls : ""}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
