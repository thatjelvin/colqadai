"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type CollyAction =
  | {
      action: "navigate";
      path: string;
    }
  | null;

type CollyQuickAction = {
  label: string;
  path: string;
};

function extractActionJson(text: string): CollyAction {
  const candidates = text.match(/\{[\s\S]*?\}/g) ?? [];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.action === "navigate" && typeof parsed?.path === "string") {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function stripActionJson(text: string) {
  return text.replace(/\{[\s\S]*?\}/g, "").trim();
}

export function CollyAgent() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [responseText, setResponseText] = useState("");
  const [responseActions, setResponseActions] = useState<CollyQuickAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => query.trim().length > 0 && !isLoading, [query, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    const prompt = query.trim();
    setIsLoading(true);
    setResponseActions([]);

    try {
      const response = await fetch("/api/colly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      if (!response.ok) {
        throw new Error("Could not reach Colly right now.");
      }

      const payload = await response.json();
      const rawText = typeof payload?.message === "string" ? payload.message : "";
      const action = extractActionJson(rawText);
      const message = stripActionJson(rawText) || rawText;
      setResponseText(message);

      const quickActions = Array.isArray(payload?.actions)
        ? payload.actions
            .filter((item: unknown): item is CollyQuickAction => {
              if (!item || typeof item !== "object") return false;
              const candidate = item as { label?: unknown; path?: unknown };
              return typeof candidate.label === "string" && typeof candidate.path === "string";
            })
            .slice(0, 4)
        : [];
      setResponseActions(quickActions);

      if (action?.action === "navigate" && action.path) {
        setTimeout(() => {
          router.push(action.path);
        }, 400);
      }
    } catch {
      setResponseText(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "Network error — please check your connection and try again."
          : "Server error — please try again in a moment."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Colly</p>
            <p className="text-xs text-muted-foreground">Your study assistant</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask Colly anything — search a topic, start a review, or ask for help"
            className="h-12"
          />
          <Button type="submit" className="h-12 px-4" disabled={!canSubmit} aria-label="Send message to Colly">
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="min-h-12 rounded-md border bg-muted/20 p-3 text-sm">
          {isLoading ? (
            <span className="text-muted-foreground">Colly is thinking…</span>
          ) : responseText ? (
            responseText
          ) : (
            <span className="text-muted-foreground">Colly’s response will appear here.</span>
          )}
        </div>
        {responseActions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {responseActions.map((action) => (
              <Button
                key={`${action.label}-${action.path}`}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(action.path)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
