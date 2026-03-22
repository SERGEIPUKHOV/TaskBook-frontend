import { describe, expect, it } from "vitest";

import {
  DARK_THEME_COLOR,
  LIGHT_THEME_COLOR,
  parseStoredTheme,
  resolveTheme,
  themeColorFor,
} from "@/lib/theme";

describe("parseStoredTheme", () => {
  it("reads a plain stored theme value", () => {
    expect(parseStoredTheme("dark")).toBe("dark");
  });

  it("reads a zustand persist payload", () => {
    expect(parseStoredTheme(JSON.stringify({ state: { theme: "light" }, version: 0 }))).toBe("light");
  });

  it("falls back to system for invalid payloads", () => {
    expect(parseStoredTheme("not-json")).toBe("system");
    expect(parseStoredTheme(JSON.stringify({ state: { theme: "sepia" } }))).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves system preference against the OS mode", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("keeps explicit light and dark choices", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("themeColorFor", () => {
  it("returns the matching browser theme-color for each resolved theme", () => {
    expect(themeColorFor("light")).toBe(LIGHT_THEME_COLOR);
    expect(themeColorFor("dark")).toBe(DARK_THEME_COLOR);
  });
});
