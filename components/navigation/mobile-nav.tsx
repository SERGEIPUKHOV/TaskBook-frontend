"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CalendarIcon, CalendarSyncIcon, DashboardIcon, DayIcon, UserIcon, WeekIcon } from "@/components/ui/icons";
import { currentContext, getDayNavHref, getMonthNavHref, getWeekNavHref } from "@/lib/nav-hrefs";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useNavStore } from "@/store/nav-store";

export function MobileNav() {
  const pathname = usePathname();
  const context = currentContext(pathname);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const stopViewingAs = useAppStore((state) => state.stopViewingAs);
  const lastDay = useNavStore((state) => state.lastDay);
  const lastMonth = useNavStore((state) => state.lastMonth);
  const lastWeek = useNavStore((state) => state.lastWeek);
  const today = new Date();
  const monthHref = getMonthNavHref({ context, lastDay, lastMonth, lastWeek, pathname, today });
  const weekHref = getWeekNavHref({ context, lastDay, lastWeek, pathname, today });
  const dayHref = getDayNavHref({ context, lastDay, pathname, today });

  const items = [
    {
      href: "/dashboard",
      label: "Дашборд",
      icon: DashboardIcon,
      active: pathname === "/dashboard",
    },
    {
      href: monthHref,
      label: "Месяц",
      icon: CalendarIcon,
      active: pathname.startsWith("/month"),
    },
    {
      href: weekHref,
      label: "Неделя",
      icon: WeekIcon,
      active: pathname.startsWith("/week"),
    },
    {
      href: dayHref,
      label: "День",
      icon: DayIcon,
      active: pathname.startsWith("/day/"),
    },
    {
      href: "/calendar",
      label: "Календ.",
      icon: CalendarSyncIcon,
      active: pathname.startsWith("/calendar"),
    },
    {
      href: "/profile",
      label: "Профиль",
      icon: UserIcon,
      active: pathname === "/profile",
    },
  ];

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 space-y-2 md:hidden">
      {viewingAs ? (
        <div className="rounded-[24px] border border-accent/30 bg-paper/95 px-4 py-3 shadow-paper backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Наблюдение</div>
              <div className="mt-0.5 truncate text-sm text-ink">{viewingAs.ownerEmail}</div>
            </div>
            <button
              className="shrink-0 rounded-[16px] border border-line bg-paper px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              onClick={() => stopViewingAs()}
              type="button"
            >
              Вернуться
            </button>
          </div>
        </div>
      ) : null}

      <nav>
        <div className="grid grid-cols-6 rounded-[28px] border border-line bg-paper/95 p-2 shadow-paper backdrop-blur-xl">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-3 text-[10px] transition-colors",
                item.active ? "bg-ink text-canvas" : "text-muted",
              )}
              href={item.href}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        </div>
      </nav>
    </div>
  );
}
