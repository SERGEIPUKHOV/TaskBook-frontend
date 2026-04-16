"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { CalendarIcon, CalendarSyncIcon, DashboardIcon, DayIcon, UserIcon, WeekIcon } from "@/components/ui/icons";
import { currentContext, getDayNavHref, getMonthNavHref, getWeekNavHref } from "@/lib/nav-hrefs";
import { getSupervisionSectionForPath, getSupervisionTargetHref } from "@/lib/supervision-nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useNavStore } from "@/store/nav-store";

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const context = currentContext(pathname);
  const accessibleOwners = useAppStore((state) => state.accessibleOwners);
  const fetchAccessibleOwners = useAppStore((state) => state.fetchAccessibleOwners);
  const startViewingAs = useAppStore((state) => state.startViewingAs);
  const stopViewingAs = useAppStore((state) => state.stopViewingAs);
  const viewingAs = useAppStore((state) => state.viewingAs);
  const lastDay = useNavStore((state) => state.lastDay);
  const lastMonth = useNavStore((state) => state.lastMonth);
  const lastWeek = useNavStore((state) => state.lastWeek);
  const today = new Date();
  const monthHref = getMonthNavHref({ context, lastDay, lastMonth, lastWeek, pathname, today });
  const weekHref = getWeekNavHref({ context, lastDay, lastWeek, pathname, today });
  const dayHref = getDayNavHref({ context, lastDay, pathname, today });
  const currentSection = getSupervisionSectionForPath(pathname);

  useEffect(() => {
    void fetchAccessibleOwners();
  }, [fetchAccessibleOwners]);

  function handleViewSelection(ownerId: string) {
    if (!ownerId) {
      stopViewingAs();
      router.replace(pathname);
      return;
    }

    const owner = accessibleOwners.find((item) => item.ownerId === ownerId);
    if (!owner) {
      return;
    }

    startViewingAs(owner.ownerId);
    router.replace(
      getSupervisionTargetHref({
        allowedSections: owner.sections,
        calendarHref: "/calendar",
        currentHref: pathname,
        currentSection,
        dayHref,
        monthHref,
        weekHref,
      }),
    );
  }

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
      {(accessibleOwners.length > 0 || viewingAs) ? (
        <div className="rounded-[24px] border border-line bg-paper/95 p-3 shadow-paper backdrop-blur-xl">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted">Наблюдение</div>
          <select
            className="mt-2 h-10 w-full rounded-[16px] border border-line bg-canvas px-3 text-sm text-ink outline-none"
            onChange={(event) => handleViewSelection(event.target.value)}
            value={viewingAs?.ownerId ?? ""}
          >
            <option value="">Мой аккаунт</option>
            {accessibleOwners.map((owner) => (
              <option key={owner.ownerId} value={owner.ownerId}>
                {owner.ownerEmail}
              </option>
            ))}
          </select>
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
