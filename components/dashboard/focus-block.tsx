"use client";

import { cn } from "@/lib/utils";

type FocusBlockProps = {
  compact?: boolean;
  detail?: string;
  emptyText: string;
  text: string;
  title: string;
};

export function FocusBlock({ compact = false, detail, emptyText, text, title }: FocusBlockProps) {
  const trimmedText = text.trim();

  return (
    <article className="paper-panel rounded-[32px] p-4 sm:p-6">
      <div className="text-xs uppercase tracking-[0.2em] text-muted">{title}</div>
      <div
        className={cn(
          "mt-2 leading-snug text-ink",
          compact ? "text-lg font-medium" : "text-lg font-semibold",
          trimmedText.length === 0 && "text-muted/55",
        )}
      >
        {trimmedText || emptyText}
      </div>
      {detail ? <div className="mt-3 max-w-3xl text-sm leading-7 text-muted">{detail}</div> : null}
    </article>
  );
}
