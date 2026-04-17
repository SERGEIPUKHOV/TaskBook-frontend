"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

import { TRACKER_SECTION_ITEMS, isTrackerSection } from "./tracker-meta";
import { TrackerSprintSelector } from "./tracker-sprint-selector";

export function TrackerSidebar() {
  const searchParams = useSearchParams();
  const activeSection = isTrackerSection(searchParams.get("section")) ? searchParams.get("section") : "money";

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <TrackerSprintSelector />
      <div className="rounded-[28px] border border-line bg-paper/85 p-3 shadow-paper">
        <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.18em] text-muted">Секции</div>
        <div className="space-y-2">
          {TRACKER_SECTION_ITEMS.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <Link
                key={section.id}
                className={cn(
                  "flex items-center gap-3 rounded-[18px] border px-3 py-3 text-sm transition-colors",
                  isActive
                    ? "border-ink bg-ink text-canvas"
                    : "border-transparent bg-paper text-muted hover:border-line hover:text-ink",
                )}
                href={`/tracker?section=${section.id}`}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold", isActive ? "border-canvas/20 bg-canvas/10 text-canvas" : "border-line bg-canvas text-ink")}>{section.icon}</span>
                <span>{section.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <Link
        className="mt-auto flex items-center gap-3 rounded-[22px] border border-line bg-paper/85 px-4 py-4 text-sm font-medium text-ink shadow-paper transition-colors hover:border-accent hover:text-accent"
        href="/tracker/overview"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-canvas text-xs font-semibold">≡</span>
        <span>Обзор спринта</span>
      </Link>
    </div>
  );
}
