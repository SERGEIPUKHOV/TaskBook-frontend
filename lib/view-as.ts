let currentViewAsOwnerId: string | null = null;

const SKIPPED_PREFIXES = ["/auth/", "/supervision/", "/users/"] as const;

export function getViewAsOwnerId(): string | null {
  return currentViewAsOwnerId;
}

export function setViewAsOwnerId(ownerId: string | null): void {
  currentViewAsOwnerId = ownerId;
}

export function shouldAttachViewAsHeader(path: string): boolean {
  return !SKIPPED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
