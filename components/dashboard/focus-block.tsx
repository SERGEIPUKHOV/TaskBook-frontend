"use client";

import { cn } from "@/lib/utils";

type FocusBlockProps = {
  detail?: string;
  emptyText: string;
  text: string;
  title: string;
};

export function FocusBlock({ detail, emptyText, text, title }: FocusBlockProps) {
  const trimmedText = text.trim();

  return (
    <article className="paper-panel rounded-[32px] p-4 sm:p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{title}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold leading-snug text-ink",
          trimmedText.length === 0 && "text-[#c4c4c0]",
        )}
      >
        {trimmedText || emptyText}
      </div>
      {detail ? <div className="mt-3 max-w-3xl text-sm leading-7 text-muted">{detail}</div> : null}
    </article>
  );
}
