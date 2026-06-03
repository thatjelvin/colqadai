"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DEFAULT_THEME,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

interface SettingsFormProps {
  defaultValues: {
    name: string;
    grade: string;
    course: string;
    age?: number;
    themePreference?: ThemePreference;
  };
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [formData, setFormData] = useState({
    name: defaultValues.name,
    grade: defaultValues.grade,
    course: defaultValues.course,
    age: defaultValues.age?.toString() ?? "",
  });
  const [theme, setTheme] = useState<ThemePreference>(
    defaultValues.themePreference ?? DEFAULT_THEME
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isThemePreference(stored)) {
      setTheme(stored);
    }
  }, []);

  const handleThemeChange = async (preference: ThemePreference) => {
    setTheme(preference);
    setSuccess(false);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: formData.grade || "Not set",
          course: formData.course || "Not set",
          theme_preference: preference,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save theme preference.");
      } else {
        setError(null);
      }
    } catch {
      setError("Could not sync theme preference to your account.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || undefined,
          grade: formData.grade,
          course: formData.course,
          age: formData.age ? parseInt(formData.age, 10) : undefined,
          theme_preference: theme,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save settings. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="settings-name">Display Name</Label>
        <Input
          id="settings-name"
          placeholder="Your name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-grade">Education Level / Grade</Label>
        <Input
          id="settings-grade"
          placeholder="e.g. Year 2 University, A-Level"
          required
          value={formData.grade}
          onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-course">Primary Course / Field of Study</Label>
        <Input
          id="settings-course"
          placeholder="e.g. Mathematics, Computer Science"
          required
          value={formData.course}
          onChange={(e) => setFormData({ ...formData, course: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-age">Age</Label>
        <Input
          id="settings-age"
          type="number"
          placeholder="e.g. 20"
          min="1"
          max="120"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Appearance</Label>
          <p className="text-xs text-muted-foreground">
            Choose how Colqad looks. System follows your operating system preference.
          </p>
        </div>
        <ThemeToggle defaultValue={theme} onChange={handleThemeChange} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Settings saved successfully.</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
