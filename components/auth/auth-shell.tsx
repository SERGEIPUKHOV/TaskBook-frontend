import Link from "next/link";

import { CalendarIcon } from "@/components/ui/icons";

type AuthShellProps = {
  children: React.ReactNode;
  footer?: React.ReactNode;
  subtitle?: string;
  title: string;
};

export function AuthShell({ children, footer, subtitle, title }: AuthShellProps) {
  return (
    <div className="auth-page-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link className="inline-flex items-center gap-3" href="/login">
            <span className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-line bg-paper shadow-paper">
              <CalendarIcon className="h-5 w-5 text-accent" />
            </span>
            <span className="text-left">
              <span className="block text-[22px] font-semibold tracking-tight text-ink">TaskBook</span>
              <span className="block text-[13px] text-muted">Цифровой ежедневник</span>
            </span>
          </Link>
        </div>

        <section className="auth-card p-8 sm:p-9">
          <header className="mb-7">
            <h1 className="auth-title text-[22px] font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="auth-subtitle mt-2 text-sm leading-6">{subtitle}</p> : null}
          </header>
          {children}
          {footer ? <footer className="mt-6">{footer}</footer> : null}
        </section>
      </div>
    </div>
  );
}
