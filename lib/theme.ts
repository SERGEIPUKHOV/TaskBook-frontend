export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "taskbook-theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const LIGHT_THEME_COLOR = "#f9f9f8";
export const DARK_THEME_COLOR = "#100f0e";

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function parseStoredTheme(rawValue: string | null): ThemePreference {
  if (!rawValue) {
    return "system";
  }

  try {
    const parsed = JSON.parse(rawValue) as
      | ThemePreference
      | { state?: { theme?: ThemePreference }; theme?: ThemePreference };
    const candidate =
      typeof parsed === "object" && parsed !== null
        ? parsed.state?.theme ?? parsed.theme
        : parsed;

    return isThemePreference(candidate) ? candidate : "system";
  } catch {
    return isThemePreference(rawValue) ? rawValue : "system";
  }
}

export function resolveTheme(theme: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return theme;
}

export function themeColorFor(theme: ResolvedTheme): string {
  return theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
}

export function buildThemeInitScript(): string {
  return `
    (function () {
      var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
      var mediaQuery = ${JSON.stringify(THEME_MEDIA_QUERY)};
      var lightThemeColor = ${JSON.stringify(LIGHT_THEME_COLOR)};
      var darkThemeColor = ${JSON.stringify(DARK_THEME_COLOR)};
      var rawValue = null;

      try {
        rawValue = window.localStorage.getItem(storageKey);
      } catch (error) {
        rawValue = null;
      }

      var theme = "system";

      if (rawValue) {
        try {
          var parsed = JSON.parse(rawValue);
          var candidate =
            parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object"
              ? parsed.state.theme
              : parsed && typeof parsed === "object"
                ? parsed.theme
                : parsed;

          if (candidate === "light" || candidate === "dark" || candidate === "system") {
            theme = candidate;
          }
        } catch (error) {
          if (rawValue === "light" || rawValue === "dark" || rawValue === "system") {
            theme = rawValue;
          }
        }
      }

      var systemPrefersDark = false;

      try {
        systemPrefersDark = !!(window.matchMedia && window.matchMedia(mediaQuery).matches);
      } catch (error) {
        systemPrefersDark = false;
      }

      var resolvedTheme = theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", resolvedTheme === "dark");

      var themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute("content", resolvedTheme === "dark" ? darkThemeColor : lightThemeColor);
      }
    })();
  `;
}
