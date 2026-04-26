"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Flame,
  Target,
  BookOpen,
  Grid3x3,
  BarChart3,
  Clock,
} from "lucide-react";
import { CollyAgent } from "@/components/dashboard/CollyAgent";

type OverviewStats = {
  totalSeen: number;
  masteredCount: number;
  masteryPercentage: number;
  dueCount: number;
  streak: number;
};

type RecentTopic = {
  topic_slug: string;
  first_explored_at: string;
  displayName: string;
  parentDisplayName: string | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [recentTopic, setRecentTopic] = useState<RecentTopic | null | undefined>(undefined);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) setStats(await res.json());
    } catch {
      setStats({ totalSeen: 0, masteredCount: 0, masteryPercentage: 0, dueCount: 0, streak: 0 });
    }
  }, []);

  const fetchUserName = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null;
      if (name) setUserName(name as string);
    } catch {
      // ignore
    }
  }, []);

  const fetchRecentTopic = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/recent-topic");
      if (res.ok) setRecentTopic(await res.json());
      else setRecentTopic(null);
    } catch {
      setRecentTopic(null);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUserName();
    fetchRecentTopic();
  }, [fetchStats, fetchUserName, fetchRecentTopic]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">
          {userName
            ? `${getGreeting()}, ${userName.split(" ")[0]}${stats && stats.streak > 0 ? ` — 🔥 ${stats.streak}-day streak` : ""}`
            : "Dashboard"}
        </h1>
        <p className="text-muted-foreground">Your learning hub — review progress or jump into practice.</p>
      </div>

      <CollyAgent />

      {recentTopic === undefined ? null : recentTopic === null ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 shrink-0" />
            No activity yet — start exploring topics.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <BookOpen className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Continue where you left off</p>
                <p className="font-semibold truncate">{recentTopic.displayName}</p>
                {recentTopic.parentDisplayName && (
                  <p className="text-xs text-muted-foreground truncate">{recentTopic.parentDisplayName}</p>
                )}
              </div>
            </div>
            <Link href={`/explore/${recentTopic.topic_slug}`} className="shrink-0">
              <Button size="sm">Continue</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-700 dark:text-orange-300 font-medium">Streak</CardDescription>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats?.streak ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">days</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700 dark:text-blue-300 font-medium">Reviewed</CardDescription>
              <Brain className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalSeen ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">problems</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700 dark:text-green-300 font-medium">Mastery</CardDescription>
              <Target className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.masteryPercentage ?? "—"}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">of seen problems</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-700 dark:text-amber-300 font-medium">Due Today</CardDescription>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats?.dueCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">items to review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">
              Content upload has been removed. Use topics, study, and notebooks to continue learning.
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Access</h2>
          <div className="space-y-2">
            {[
              { href: "/review", icon: Brain, label: "Spaced Review", desc: "Review due problems" },
              { href: "/topics", icon: Grid3x3, label: "Topics", desc: "Browse all math topics" },
              { href: "/notebooks", icon: BookOpen, label: "Notebooks", desc: "Deep-dive source workspace", premium: true },
              { href: "/analytics", icon: BarChart3, label: "Analytics", desc: "Track your performance", premium: true },
            ].map((item) => (
              <Link key={item.href} href={item.premium ? "/pricing" : item.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.premium && (
                            <Badge className="text-[10px] py-0 bg-amber-500 hover:bg-amber-500 text-white">PRO</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {stats && stats.dueCount > 0 ? (
            <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  You have {stats.dueCount} problem{stats.dueCount !== 1 ? "s" : ""} due for review.
                </p>
                <Link href="/review">
                  <Button size="sm" className="mt-2 w-full animate-pulse">
                    Start Review →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : stats !== null ? (
            <Card className="border-muted">
              <CardContent className="py-3 px-4">
                <p className="text-sm text-muted-foreground">
                  🎉 Nothing due today — great work keeping up!
                </p>
                <Link href="/topics">
                  <Button size="sm" variant="outline" className="mt-2 w-full">
                    Browse Topics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
