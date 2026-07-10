"use client";

import { useEffect } from "react";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  parseStoredTheme,
  resolveTheme,
} from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = (preference: string | null) => {
      const resolved = resolveTheme(parseStoredTheme(preference), media.matches);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };

    apply(window.localStorage.getItem(THEME_STORAGE_KEY));

    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        apply(event.newValue);
      }
    };
    const onSystemChange = () => {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored || stored === "system" || stored === DEFAULT_THEME) {
        apply(stored);
      }
    };

    window.addEventListener("storage", onStorage);
    media.addEventListener("change", onSystemChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      media.removeEventListener("change", onSystemChange);
    };
  }, []);

  return <>{children}</>;
}
