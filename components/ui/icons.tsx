type IconProps = {
  className?: string;
};

function iconClassName(className?: string): string {
  return `h-5 w-5 ${className ?? ""}`.trim();
}

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 3.5v3" />
      <path d="M17 3.5v3" />
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

export function DayIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 2.75v3" />
      <path d="M16 2.75v3" />
      <path d="M4 9h16" />
      <circle cx="12" cy="14" r="2.5" />
    </svg>
  );
}

export function WeekIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8.5 9.5v10" />
      <path d="M13.5 9.5v10" />
      <path d="M18.5 9.5v10" />
    </svg>
  );
}

export function HeartMetricIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.5s-7-4.7-7-10.3A4.2 4.2 0 0 1 9.3 6c1.2 0 2.2.5 2.7 1.5.5-1 1.5-1.5 2.7-1.5A4.2 4.2 0 0 1 19 10.2c0 5.6-7 10.3-7 10.3Z" />
    </svg>
  );
}

export function ProductivityMetricIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2.5 5.5 13h5l-1 8.5L18.5 11h-5l-.5-8.5Z" />
    </svg>
  );
}

export function AnxietyMetricIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4.5 19.5 18h-15L12 4.5Z" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 6.5 8.5 12l6 5.5" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.5 6.5 15.5 12l-6 5.5" />
    </svg>
  );
}

export function GripIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="8" cy="6.5" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
      <circle cx="8" cy="17.5" r="1.2" />
      <circle cx="16" cy="6.5" r="1.2" />
      <circle cx="16" cy="12" r="1.2" />
      <circle cx="16" cy="17.5" r="1.2" />
    </svg>
  );
}

export function SignalIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 15a11 11 0 0 1 15 0" />
      <path d="M7.5 18a7 7 0 0 1 9 0" />
      <path d="M10.5 21a3 3 0 0 1 3 0" />
    </svg>
  );
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.5" />
      <path d="M12 19v2.5" />
      <path d="m5.2 5.2 1.8 1.8" />
      <path d="m17 17 1.8 1.8" />
      <path d="M2.5 12H5" />
      <path d="M19 12h2.5" />
      <path d="m5.2 18.8 1.8-1.8" />
      <path d="m17 7 1.8-1.8" />
    </svg>
  );
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 15.2A8.5 8.5 0 1 1 8.8 4a7.2 7.2 0 0 0 11.2 11.2Z" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.5 20a7.5 7.5 0 0 0-15 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export function LogOutIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15.5 16.5 20 12l-4.5-4.5" />
      <path d="M9.5 12H20" />
      <path d="M13.5 4.5h-7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <svg
      className={iconClassName(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3 21 21" />
      <path d="M10.6 5.7A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a18.1 18.1 0 0 1-4.1 4.9" />
      <path d="M6.1 6.1A17.7 17.7 0 0 0 2.5 12s3.5 6.5 9.5 6.5a9.9 9.9 0 0 0 3.2-.5" />
      <path d="M9.9 9.9A3 3 0 0 0 12 15a3 3 0 0 0 2.1-.9" />
    </svg>
  );
}
