"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { TrackerSprintSelector } from "./tracker-sprint-selector";

export function TrackerSidebar() {
  const pathname = usePathname();
  const isOverview = pathname === "/tracker/overview";

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <TrackerSprintSelector />
      <Link
        className={cn(
          "flex items-center gap-3 rounded-[22px] border px-4 py-4 text-sm font-medium shadow-paper transition-colors",
          isOverview
            ? "border-ink bg-ink text-canvas"
            : "border-line bg-paper/85 text-ink hover:border-accent hover:text-accent",
        )}
        href="/tracker/overview"
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
            isOverview ? "border-canvas/20 bg-canvas/10 text-canvas" : "border-line bg-canvas text-ink",
          )}
        >
          ≡
        </span>
        <span>Обзор дедлайнов</span>
      </Link>
    </div>
  );
}
