import {
  DEFAULT_THEME,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  htmlClassFor,
  inlineThemeScript,
  isThemePreference,
  parseStoredTheme,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";

describe("theme helpers", () => {
  describe("isThemePreference", () => {
    it.each<ThemePreference>(["light", "dark", "system"])("accepts '%s'", (value) => {
      expect(isThemePreference(value)).toBe(true);
    });

    it.each([
      ["empty string", ""],
      ["uppercase", "DARK"],
      ["null", null],
      ["undefined", undefined],
      ["number", 0],
      ["object", {}],
    ])("rejects %s", (_label, value) => {
      expect(isThemePreference(value)).toBe(false);
    });
  });

  describe("parseStoredTheme", () => {
    it("returns the stored value when valid", () => {
      expect(parseStoredTheme("dark")).toBe("dark");
      expect(parseStoredTheme("light")).toBe("light");
      expect(parseStoredTheme("system")).toBe("system");
    });

    it("falls back to the default when invalid or missing", () => {
      expect(parseStoredTheme(null)).toBe(DEFAULT_THEME);
      expect(parseStoredTheme(undefined)).toBe(DEFAULT_THEME);
      expect(parseStoredTheme("")).toBe(DEFAULT_THEME);
      expect(parseStoredTheme("DARK")).toBe(DEFAULT_THEME);
    });
  });

  describe("resolveTheme", () => {
    it("returns 'dark' when preference is dark regardless of system", () => {
      expect(resolveTheme("dark", true)).toBe("dark");
      expect(resolveTheme("dark", false)).toBe("dark");
    });

    it("returns 'light' when preference is light regardless of system", () => {
      expect(resolveTheme("light", true)).toBe("light");
      expect(resolveTheme("light", false)).toBe("light");
    });

    it("delegates to the system for the 'system' preference", () => {
      expect(resolveTheme("system", true)).toBe("dark");
      expect(resolveTheme("system", false)).toBe("light");
    });
  });

  describe("htmlClassFor", () => {
    it("returns 'dark' for the dark theme", () => {
      expect(htmlClassFor("dark")).toBe("dark");
    });

    it("returns an empty string for the light theme", () => {
      expect(htmlClassFor("light")).toBe("");
    });
  });

  describe("inlineThemeScript", () => {
    it("embeds the storage key", () => {
      const script = inlineThemeScript("custom-key");
      expect(script).toContain("custom-key");
    });

    it("defaults to THEME_STORAGE_KEY", () => {
      const script = inlineThemeScript();
      expect(script).toContain(THEME_STORAGE_KEY);
    });

    it("produces self-contained, no-throw code", () => {
      const script = inlineThemeScript();
      expect(script).toContain("try");
      expect(script).toContain("catch");
      expect(script).toContain("prefers-color-scheme: dark");
      expect(script).toContain("classList.toggle('dark'");
    });
  });

  describe("THEME_PREFERENCES", () => {
    it("lists the three supported preferences in order", () => {
      expect(THEME_PREFERENCES).toEqual(["light", "dark", "system"]);
    });
  });
});
