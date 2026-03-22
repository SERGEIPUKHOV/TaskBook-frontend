import { beforeEach, describe, expect, it, vi } from "vitest";

import { DARK_THEME_COLOR, LIGHT_THEME_COLOR } from "@/lib/theme";
import { useThemeStore } from "@/store/theme-store";

function createMatchMedia(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

function mountThemeColorMeta() {
  document.head.innerHTML = "";
  const meta = document.createElement("meta");
  meta.name = "theme-color";
  meta.content = LIGHT_THEME_COLOR;
  document.head.appendChild(meta);
  return meta;
}

describe("useThemeStore cycleTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: createMatchMedia(false),
      writable: true,
    });
    document.documentElement.className = "";
    mountThemeColorMeta();
    useThemeStore.setState({
      hasHydrated: true,
      resolvedTheme: "light",
      theme: "light",
    });
  });

  it("cycles light -> dark -> system -> light", () => {
    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      DARK_THEME_COLOR,
    );

    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      LIGHT_THEME_COLOR,
    );

    useThemeStore.getState().cycleTheme();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(useThemeStore.getState().resolvedTheme).toBe("light");
  });

  it("resolves system mode against a dark OS preference", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: createMatchMedia(true),
      writable: true,
    });
    document.documentElement.classList.add("dark");
    useThemeStore.setState({
      hasHydrated: true,
      resolvedTheme: "dark",
      theme: "dark",
    });

    useThemeStore.getState().cycleTheme();

    expect(useThemeStore.getState().theme).toBe("system");
    expect(useThemeStore.getState().resolvedTheme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      DARK_THEME_COLOR,
    );
  });
});
