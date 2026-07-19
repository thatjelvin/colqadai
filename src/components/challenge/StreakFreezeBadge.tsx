"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Snowflake, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakFreezeBadgeProps {
  plan: "FREE" | "PRO" | "MAX";
}

export function StreakFreezeBadge({ plan }: StreakFreezeBadgeProps) {
  const [available, setAvailable] = useState(false);
  const [used, setUsed] = useState(false);
  const [activating, setActivating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (plan === "FREE") {
      setLoading(false);
      return;
    }
    fetch("/api/challenge/freeze")
      .then((res) => res.json())
      .then((data) => {
        setAvailable(data.available ?? false);
        if (data.used) setUsed(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [plan]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch("/api/challenge/freeze", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setUsed(true);
        setAvailable(false);
      }
    } catch {
      // ignore
    } finally {
      setActivating(false);
    }
  };

  if (plan === "FREE") {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
        <Snowflake className="h-3 w-3" />
        PRO Feature
      </Badge>
    );
  }

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
      </Badge>
    );
  }

  if (used) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <Snowflake className="h-3 w-3" />
        Freeze Used
      </Badge>
    );
  }

  if (available) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleActivate}
        disabled={activating}
        className={cn("gap-1 text-xs h-7", activating && "opacity-50")}
      >
        {activating ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Snowflake className="h-3 w-3 text-blue-400" />
        )}
        Freeze Streak
      </Button>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Snowflake className="h-3 w-3" />
      Freeze Used
    </Badge>
  );
}
