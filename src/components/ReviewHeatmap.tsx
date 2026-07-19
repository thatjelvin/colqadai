"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  /** Keys in "YYYY-MM-DD" format representing days with reviews */
  reviewDays: string[];
  /** Optional streak length to highlight */
  currentStreak?: number;
  className?: string;
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Get the last N weeks of dates, given today.
 * Returns weeks starting from last Sunday.
 */
function getLastNWeeks(today: Date, weeks: number): Date[][] {
  const end = new Date(today);
  // go back to the end of the last complete week
  const dayOfWeek = end.getDay(); // 0=Sun
  end.setDate(end.getDate() - dayOfWeek);

  const start = new Date(end);
  start.setDate(start.getDate() - weeks * 7 + 1);

  const weeksArr: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeksArr.push(week);
  }
  return weeksArr;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getIntensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
}

const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-muted",
  1: "bg-emerald-200 dark:bg-emerald-900/40",
  2: "bg-emerald-400 dark:bg-emerald-700/50",
  3: "bg-emerald-500 dark:bg-emerald-500/60",
  4: "bg-emerald-600 dark:bg-emerald-400/70",
};

export function ReviewHeatmap({
  reviewDays,
  currentStreak,
  className,
}: HeatmapProps) {
  // reviewDays used in weeks computation below

  const weeks = useMemo(() => getLastNWeeks(new Date(), 16), []);

  /** Map from date-key → count to support multi-review days */
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const k of reviewDays) {
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [reviewDays]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {currentStreak != null
            ? `${currentStreak}-day streak`
            : "Review Activity"}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((level) => (
            <div
              key={level}
              className={cn("h-3 w-3 rounded-sm", LEVEL_CLASSES[level])}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-0.5" style={{ minWidth: weeks.length * 14 }}>
          {/* Month labels */}
          <div className="flex flex-col gap-0.5 pr-1">
            <div className="h-4" /> {/* spacer for day-of-week row */}
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <div key={d} className="h-3 text-[10px] text-muted-foreground leading-3">
                {DAY_LABELS[d]}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => {
            const firstOfMonth = week.find(
              (d) => d.getDate() <= 7 && d.getDate() >= 1
            );
            return (
              <div key={wi} className="flex flex-col gap-0.5 relative">
                {firstOfMonth && (
                  <div className="h-4 text-[10px] text-muted-foreground leading-4 absolute -top-4 left-0 whitespace-nowrap">
                    {MONTH_LABELS[firstOfMonth.getMonth()]}
                  </div>
                )}
                {week.map((d) => {
                  const k = dayKey(d);
                  const count = countMap.get(k) ?? 0;
                  const intensity = getIntensity(count);
                  const isToday = k === dayKey(new Date());
                  return (
                    <div
                      key={k}
                      className={cn(
                        "h-3 w-3 rounded-sm transition-colors",
                        LEVEL_CLASSES[intensity],
                        isToday && "ring-1 ring-foreground/40"
                      )}
                      title={`${k}: ${count} review${count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
