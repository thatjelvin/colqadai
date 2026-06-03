"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  htmlClassFor,
  isThemePreference,
  parseStoredTheme,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";
import { Monitor, Moon, Sun } from "lucide-react";

const LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const ICONS: Record<ThemePreference, React.ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface ThemeToggleProps {
  defaultValue?: ThemePreference;
  onChange?: (preference: ThemePreference) => void;
}

export function ThemeToggle({ defaultValue, onChange }: ThemeToggleProps) {
  const [value, setValue] = useState<ThemePreference>(defaultValue ?? "system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    setValue(stored && isThemePreference(stored) ? stored : defaultValue ?? "system");
    setMounted(true);
  }, [defaultValue]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_STORAGE_KEY, value);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const resolved = resolveTheme(value, media.matches);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    onChange?.(value);
  }, [value, mounted, onChange]);

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className="inline-flex items-center rounded-md border border-border bg-card p-1"
    >
      {THEME_PREFERENCES.map((preference) => {
        const Icon = ICONS[preference];
        const selected = value === preference;
        return (
          <button
            key={preference}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setValue(preference)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{LABELS[preference]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function currentThemeClassName(preference: ThemePreference, systemPrefersDark: boolean): string {
  return htmlClassFor(resolveTheme(preference, systemPrefersDark));
}
