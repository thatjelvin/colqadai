"use client";

import Link from "next/link";

export default function HeroButtons() {
  return (
    <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
      <Link
        href="/register"
        className="rounded-md bg-[#F5EFE0] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#F5EFE0]/90"
      >
        Get Started Free
      </Link>
      <a
        href="#how-it-works"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
        }}
        className="rounded-md border border-[#F5EFE0] px-6 py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#F5EFE0]/10"
      >
        See How It Works
      </a>
    </div>
  );
}
