"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SettingsFormProps {
  defaultValues: {
    name: string;
    grade: string;
    course: string;
    age?: number;
  };
}

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [formData, setFormData] = useState({
    name: defaultValues.name,
    grade: defaultValues.grade,
    course: defaultValues.course,
    age: defaultValues.age?.toString() ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || undefined,
          grade: formData.grade,
          course: formData.course,
          age: formData.age ? parseInt(formData.age, 10) : undefined,
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Settings saved successfully.</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
