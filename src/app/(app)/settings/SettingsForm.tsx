"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TimePicker } from "@/components/time-picker";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DEFAULT_THEME,
  isThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";
import { NotificationPreferences, DEFAULT_PREFERENCES } from "@/lib/notifications";

interface SettingsFormProps {
  defaultValues: {
    name: string;
    grade: string;
    course: string;
    age?: number;
    themePreference?: ThemePreference;
    notificationPreferences?: NotificationPreferences;
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
  const [notifications, setNotifications] = useState<NotificationPreferences>(
    defaultValues.notificationPreferences ?? DEFAULT_PREFERENCES
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

  const handleNotificationChange = async (updates: Partial<NotificationPreferences>) => {
    setNotifications((prev) => {
      const merged = { ...prev, ...updates };
      // Fire the API call with the merged value outside setState to avoid stale closure
      fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error ?? "Failed to save notification preferences.");
        } else {
          setError(null);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      }).catch(() => {
        setError("Could not save notification preferences.");
      });
      return merged;
    });
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
          grade: formData.grade || "Not set",
          course: formData.course || "Not set",
          age: formData.age ? parseInt(formData.age) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save profile.");
      } else {
        setError(null);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError("Could not save profile.");
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

      <Separator />

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-medium">Notification Preferences</Label>
          <p className="text-xs text-muted-foreground">
            Stay updated with reminders and progress summaries.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="notif-daily"
              type="checkbox"
              checked={notifications.dailyReminder}
              onChange={(e) =>
                handleNotificationChange({ dailyReminder: e.target.checked })
              }
            />
            <Label htmlFor="notif-daily" className="text-sm font-medium">
              Daily review reminders
            </Label>
          </div>
          {notifications.dailyReminder && (
            <div className="ml-4 space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Label htmlFor="notif-time" className="w-20">
                  Time:
                </Label>
                <TimePicker
                  value={notifications.dailyReminderTime}
                  onChange={(time) =>
                    handleNotificationChange({
                      dailyReminderTime: time,
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You&apos;ll receive a reminder at this time each day to review your
                flashcards.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="notif-streak"
              type="checkbox"
              checked={notifications.streakAtRisk}
              onChange={(e) =>
                handleNotificationChange({ streakAtRisk: e.target.checked })
              }
            />
            <Label htmlFor="notif-streak" className="text-sm font-medium">
              Streak at risk notifications
            </Label>
          </div>
          <p className="ml-4 text-xs text-muted-foreground">
            Get notified at 8 PM local time if you haven&apos;t reviewed today to
            prevent losing your streak.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="notif-milestone"
              type="checkbox"
              checked={notifications.milestoneCongrats}
              onChange={(e) =>
                handleNotificationChange({ milestoneCongrats: e.target.checked })
              }
            />
            <Label htmlFor="notif-milestone" className="text-sm font-medium">
              Milestone celebrations
            </Label>
          </div>
          <p className="ml-4 text-xs text-muted-foreground">
            Celebrate when you hit 7, 14, 30, 50, and 100 day streaks!
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              id="notif-weekly"
              type="checkbox"
              checked={notifications.weeklySummary}
              onChange={(e) =>
                handleNotificationChange({ weeklySummary: e.target.checked })
              }
            />
            <Label htmlFor="notif-weekly" className="text-sm font-medium">
              Weekly progress summary
            </Label>
          </div>
          <p className="ml-4 text-xs text-muted-foreground">
            Receive a summary of your learning progress every Monday morning.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Settings saved successfully.</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}