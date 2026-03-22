"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CalendarIcon, DashboardIcon, DayIcon, UserIcon, WeekIcon } from "@/components/ui/icons";
import { currentContext, getDayNavHref, getMonthNavHref, getWeekNavHref } from "@/lib/nav-hrefs";
import { cn } from "@/lib/utils";
import { useNavStore } from "@/store/nav-store";

export function MobileNav() {
  const pathname = usePathname();
  const context = currentContext(pathname);
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
      href: "/profile",
      label: "Профиль",
      icon: UserIcon,
      active: pathname === "/profile",
    },
  ];

  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 md:hidden">
      <div className="grid grid-cols-5 rounded-[28px] border border-line bg-paper/95 p-2 shadow-paper backdrop-blur-xl">
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
  );
}
