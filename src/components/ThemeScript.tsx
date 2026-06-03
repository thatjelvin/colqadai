import Script from "next/script";
import { inlineThemeScript, THEME_STORAGE_KEY } from "@/lib/theme";

export function ThemeScript() {
  return (
    <Script
      id="colqad-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: inlineThemeScript(THEME_STORAGE_KEY) }}
    />
  );
}
