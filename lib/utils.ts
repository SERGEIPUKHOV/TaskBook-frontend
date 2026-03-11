export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function arrayMove<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);

  if (typeof moved === "undefined") {
    return next;
  }

  next.splice(toIndex, 0, moved);
  return next;
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
