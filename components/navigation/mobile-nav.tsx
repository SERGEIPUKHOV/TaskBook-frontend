"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CalendarIcon, DashboardIcon, DayIcon, UserIcon, WeekIcon } from "@/components/ui/icons";
import { getWeeksForMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const today = new Date();
  const currentMonth = { year: today.getFullYear(), month: today.getMonth() + 1 };
  const currentWeek = getWeeksForMonth(currentMonth.year, currentMonth.month)[0];
  const currentDayHref = `/day/${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()}`;

  const items = [
    {
      href: "/dashboard",
      label: "Дашборд",
      icon: DashboardIcon,
      active: pathname === "/dashboard",
    },
    {
      href: `/month/${currentMonth.year}/${currentMonth.month}`,
      label: "Месяц",
      icon: CalendarIcon,
      active: pathname.startsWith("/month"),
    },
    {
      href: currentWeek ? `/week/${currentWeek.year}/${currentWeek.week}` : "/dashboard",
      label: "Неделя",
      icon: WeekIcon,
      active: pathname.startsWith("/week"),
    },
    {
      href: currentDayHref,
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
                item.active ? "bg-ink text-white" : "text-muted",
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
