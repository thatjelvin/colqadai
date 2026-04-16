"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UsageSummary = {
  plan: "free" | "pro" | "max";
  usage: {
    chatMessages: { used: number; limit: number };
    newChatSessions: { used: number; limit: number };
    problemStarts: { used: number; limit: number };
  };
};

type PlanConfig = {
  code: "free" | "pro" | "max";
  title: string;
  price: string;
  headline: string;
  features: string[];
  highlight?: boolean;
};

const plans: PlanConfig[] = [
  {
    code: "free",
    title: "Free",
    price: "$0",
    headline: "Start building momentum — no card needed.",
    features: [
      "AI tutor when you need a nudge (10 msgs/day)",
      "20 practice problems per day",
      "Core spaced repetition + progress dashboard",
      "5 material summaries per day",
      "7-day analytics overview",
    ],
  },
  {
    code: "pro",
    title: "Pro",
    price: "$6.99/mo",
    headline: "AI help whenever you're stuck — not rationed.",
    highlight: true,
    features: [
      "120 AI tutor messages/day, 30 sessions",
      "200 problem starts/day",
      "Turn lecture notes into a revision guide in seconds (unlimited summaries)",
      "Full analytics — see exactly where to improve",
      "Up to 10 Notebooks for deep-dive study",
    ],
  },
  {
    code: "max",
    title: "Max — Exam Mode",
    price: "$16.99/mo",
    headline: "Unlimited power for the week before finals.",
    features: [
      "600 AI tutor messages/day, 120 sessions",
      "1,000 problem starts/day",
      "Unlimited Notebooks",
      "Priority AI responses (4096 tokens)",
      "Early access to new features",
    ],
  },
];

export function PricingCards({ usage }: { usage: UsageSummary | null }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const startCheckout = async (plan: "free" | "pro" | "max") => {
    if (plan === "free") {
      return;
    }

    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error(error);
      alert("Unable to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const downgradeToFree = async () => {
    setLoadingPlan("free");
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "free" }),
      });

      if (!res.ok) {
        throw new Error("Failed to downgrade");
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Unable to change plan right now.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      {usage && (
        <div className="rounded-lg border bg-card p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span>Current plan</span>
            <Badge variant={usage.plan === "free" ? "outline" : "default"}>{usage.plan.toUpperCase()}</Badge>
          </div>
          <div className="grid gap-1 text-muted-foreground sm:grid-cols-3">
            <p>Chat: {usage.usage.chatMessages.used}/{usage.usage.chatMessages.limit}</p>
            <p>Sessions: {usage.usage.newChatSessions.used}/{usage.usage.newChatSessions.limit}</p>
            <p>Problem starts: {usage.usage.problemStarts.used}/{usage.usage.problemStarts.limit}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = usage?.plan === plan.code;

          return (
            <Card key={plan.code} className={plan.highlight ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.title}</CardTitle>
                  {plan.highlight && <Badge>Most Popular</Badge>}
                </div>
                <CardDescription className="text-sm font-medium text-foreground/80 mt-1">{plan.headline}</CardDescription>
                <p className="text-3xl font-bold mt-2">{plan.price}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>

                {plan.code === "free" ? (
                  isCurrent ? (
                    <Button disabled className="w-full">Current Plan</Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={downgradeToFree}
                      disabled={loadingPlan !== null}
                    >
                      {loadingPlan === "free" ? "Changing..." : "Downgrade to Free"}
                    </Button>
                  )
                ) : isCurrent ? (
                  <Button disabled className="w-full">Current Plan</Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => startCheckout(plan.code)}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === plan.code ? "Redirecting..." : `Upgrade to ${plan.title}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
