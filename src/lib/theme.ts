export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "colqad-theme";
export const DEFAULT_THEME: ThemePreference = "system";

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function parseStoredTheme(value: string | null | undefined): ThemePreference {
  if (isThemePreference(value)) return value;
  return DEFAULT_THEME;
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function htmlClassFor(resolved: ResolvedTheme): string {
  return resolved === "dark" ? "dark" : "";
}

export function inlineThemeScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{var t=localStorage.getItem(${JSON.stringify(storageKey)});var s=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||((t==='system'||!t)&&s);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
}
