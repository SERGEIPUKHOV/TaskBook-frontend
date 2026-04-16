import type { SupervisionSection } from "@/lib/planner-types";

export function getSupervisionSectionForPath(pathname: string): SupervisionSection | null {
  if (pathname === "/dashboard") {
    return "dashboard";
  }
  if (pathname.startsWith("/month/")) {
    return "month";
  }
  if (pathname.startsWith("/week/")) {
    return "week";
  }
  if (pathname.startsWith("/day/")) {
    return "day";
  }
  if (pathname.startsWith("/calendar")) {
    return "calendar";
  }
  return null;
}

export function getSupervisionTargetHref({
  allowedSections,
  calendarHref,
  currentHref,
  currentSection,
  dashboardHref = "/dashboard",
  dayHref,
  monthHref,
  weekHref,
}: {
  allowedSections: SupervisionSection[];
  calendarHref?: string;
  currentHref: string;
  currentSection: SupervisionSection | null;
  dashboardHref?: string;
  dayHref: string;
  monthHref: string;
  weekHref: string | null;
}): string {
  if (currentSection && allowedSections.includes(currentSection)) {
    return currentHref;
  }

  const hrefBySection: Record<SupervisionSection, string | null> = {
    dashboard: dashboardHref,
    month: monthHref,
    week: weekHref,
    day: dayHref,
    calendar: calendarHref ?? "/calendar",
  };

  for (const section of ["dashboard", "month", "week", "day", "calendar"] satisfies SupervisionSection[]) {
    const href = hrefBySection[section];
    if (allowedSections.includes(section) && href) {
      return href;
    }
  }

  return dashboardHref;
}
