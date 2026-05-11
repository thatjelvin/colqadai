"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

interface NavBarProps {
  isAuthenticated: boolean;
}

export default function NavBar({ isAuthenticated }: NavBarProps) {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#F5EFE0]/10 bg-[#0A0A0A]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-xl font-bold tracking-tight text-[#F5EFE0]">
          Colqad
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="text-sm text-[#F5EFE0]/80 transition hover:text-[#F5EFE0]">
            Log In
          </Link>
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className="rounded-md bg-[#F5EFE0] px-4 py-2 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#F5EFE0]/90"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started"}
          </Link>
        </div>

        <details className="group relative md:hidden">
          <summary
            aria-label="Menu"
            className="list-none cursor-pointer rounded-md border border-[#F5EFE0]/20 p-2 text-[#F5EFE0] marker:content-none"
          >
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-lg border border-[#F5EFE0]/15 bg-[#111111] p-4 shadow-xl">
            <div className="flex flex-col gap-3">
              <Link href="/login" className="text-sm text-[#F5EFE0]/85">
                Log In
              </Link>
              <Link
                href={isAuthenticated ? "/dashboard" : "/register"}
                className="rounded-md bg-[#F5EFE0] px-4 py-2 text-center text-sm font-semibold text-[#0A0A0A]"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Link>
            </div>
          </div>
        </details>
      </div>
    </nav>
  );
}
