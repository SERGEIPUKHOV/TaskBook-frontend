"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { TrackerSprintSelector } from "./tracker-sprint-selector";

const NAV_ITEMS = [
  { href: "/tracker", label: "Цели", icon: "◎" },
  { href: "/tracker/overview", label: "Обзор дедлайнов", icon: "≡" },
];

export function TrackerSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <TrackerSprintSelector />
      <div className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[22px] border px-4 py-4 text-sm font-medium shadow-paper transition-colors",
                isActive
                  ? "border-ink bg-ink text-canvas"
                  : "border-line bg-paper/85 text-ink hover:border-accent hover:text-accent",
              )}
              href={item.href}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold",
                  isActive ? "border-canvas/20 bg-canvas/10 text-canvas" : "border-line bg-canvas text-ink",
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
