"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, type SummarySectionId } from "@/lib/learning/summary-schema";

export function SectionNav({ sections }: { sections: SummarySectionId[] }) {
  const [active, setActive] = useState<SummarySectionId>(sections[0] ?? "overview");

  useEffect(() => {
    if (sections.length === 0) return;
    const handle = () => {
      const scrollY = window.scrollY + 120;
      let current: SummarySectionId = sections[0];
      for (const id of sections) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        if (el.offsetTop <= scrollY) {
          current = id;
        }
      }
      setActive(current);
    };
    handle();
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Chapter sections"
      className="sticky top-20 hidden self-start lg:block"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-1 border-l border-border">
        {sections.map((id) => (
          <li key={id}>
            <a
              href={`#section-${id}`}
              onClick={() => setActive(id)}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors",
                active === id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {SECTION_LABELS[id]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
