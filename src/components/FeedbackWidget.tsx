"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Star, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FEEDBACK_TOOLTIP_KEY = "colqad-feedback-tooltip-seen-v1";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "success" | "error">("idle");
  const [showTooltip, setShowTooltip] = useState(false);
  const [fadeTooltip, setFadeTooltip] = useState(false);

  const page = useMemo(() => pathname ?? "/", [pathname]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
      .catch(() => setUserId(null));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const tooltipSeen = window.localStorage.getItem(FEEDBACK_TOOLTIP_KEY);
    if (tooltipSeen) {
      return;
    }

    window.localStorage.setItem(FEEDBACK_TOOLTIP_KEY, "1");
    setShowTooltip(true);

    const fadeTimer = window.setTimeout(() => setFadeTooltip(true), 5000);
    const hideTimer = window.setTimeout(() => setShowTooltip(false), 5600);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !userId || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedbackStatus("idle");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          rating,
          userId,
          page,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      setMessage("");
      setRating(null);
      setFeedbackStatus("success");
      setTimeout(() => setOpen(false), 700);
    } catch {
      setFeedbackStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-4 left-3 z-[70] flex items-end gap-2 sm:left-4">
      {showTooltip ? (
        <div
          className={`max-w-[220px] rounded-md border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow transition-opacity duration-500 ${
            fadeTooltip ? "opacity-0" : "opacity-100"
          }`}
        >
          Tell us how we can make Colqad better
        </div>
      ) : null}

      {open ? (
        <Card className="w-[320px] shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Feedback</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)} aria-label="Close feedback form">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <label htmlFor="feedback-message" className="text-sm font-medium">
                What&apos;s on your mind?
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full resize-none rounded-md border bg-background p-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Share an issue, idea, or quick thought."
              />

              <div className="space-y-1">
                <p className="text-sm font-medium">Rating (optional)</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = (rating ?? 0) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        className="rounded p-1 transition hover:bg-muted"
                        onClick={() => setRating(rating === value ? null : value)}
                        aria-label={`Set rating ${value}`}
                      >
                        <Star className={`h-4 w-4 ${active ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting || message.trim().length === 0 || !userId} className="w-full">
                {isSubmitting ? "Submitting..." : "Submit feedback"}
              </Button>

              {feedbackStatus === "success" ? <p className="text-xs text-green-600">Thanks — feedback submitted.</p> : null}
              {feedbackStatus === "error" ? (
                <p className="text-xs text-red-600">Couldn&apos;t submit feedback right now. Please try again.</p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-r-md border border-l-0 bg-background px-2 py-3 text-xs font-semibold tracking-wide shadow-md [writing-mode:vertical-rl]"
        aria-label="Open feedback widget"
      >
        Feedback
      </button>
    </div>
  );
}
