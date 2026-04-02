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
  subtitle: string;
  features: string[];
  highlight?: boolean;
};

const plans: PlanConfig[] = [
  {
    code: "free",
    title: "Free",
    price: "$0",
    subtitle: "Great to start building momentum",
    features: [
      "10 AI tutor messages/day",
      "3 new chat sessions/day",
      "20 problem starts/day",
      "Core spaced repetition + dashboard",
    ],
  },
  {
    code: "pro",
    title: "Pro",
    price: "$6.99/mo",
    subtitle: "Best value for serious students",
    highlight: true,
    features: [
      "120 AI tutor messages/day",
      "30 new chat sessions/day",
      "200 problem starts/day",
      "Advanced analytics + notebooks",
    ],
  },
  {
    code: "max",
    title: "Max",
    price: "$16.99/mo",
    subtitle: "Power-user plan with priority lane",
    features: [
      "600 AI tutor messages/day",
      "120 new chat sessions/day",
      "1000 problem starts/day",
      "Priority processing + early access",
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
                <CardDescription>{plan.subtitle}</CardDescription>
                <p className="text-3xl font-bold">{plan.price}</p>
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
