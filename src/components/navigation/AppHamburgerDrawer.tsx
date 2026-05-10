"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Brain, Grid3x3, LayoutDashboard, Menu, Settings, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RecentTopicResponse = {
  topic_slug: string;
} | null;

export function AppHamburgerDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reviewHref, setReviewHref] = useState("/topics");

  useEffect(() => {
    let mounted = true;

    async function loadReviewHref() {
      try {
        const response = await fetch("/api/dashboard/recent-topic");
        if (!response.ok) {
          if (mounted) setReviewHref("/topics");
          return;
        }

        const data = (await response.json()) as RecentTopicResponse;
        if (!mounted) return;

        if (data?.topic_slug) {
          setReviewHref(`/review/${data.topic_slug}`);
        } else {
          setReviewHref("/topics");
        }
      } catch {
        if (mounted) setReviewHref("/topics");
      }
    }

    loadReviewHref();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/topics", label: "Topics", icon: Grid3x3 },
      { href: reviewHref, label: "Review", icon: Brain },
      { href: "/gaps", label: "Knowledge Gaps", icon: AlertTriangle },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
    [reviewHref]
  );

  return (
    <>
      <div className="fixed right-4 top-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((prev) => !prev)}
          className="bg-card"
          aria-label={open ? "Close navigation drawer" : "Open navigation drawer"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open ? <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-72 border-l bg-card p-5 shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm font-semibold">Navigation</p>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close navigation drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-accent font-medium" : "hover:bg-accent/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
