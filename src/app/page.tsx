import Link from "next/link";
import Script from "next/script";
import { createServerClient } from "@/lib/supabase/server";
import {
  BookOpen,
  Brain,
  Compass,
  Gauge,
  GraduationCap,
  Layers,
  ListChecks,
  Menu,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const subjects = [
  "Calculus",
  "Linear Algebra",
  "Statistics & Probability",
  "Discrete Mathematics",
  "Differential Equations",
  "Real Analysis",
  "Numerical Methods",
  "Optimization",
  "Financial Mathematics",
  "Econometrics",
  "ML Mathematics",
  "Abstract Algebra",
  "Information Theory",
];

const problemCards = [
  {
    icon: BookOpen,
    title: "Generic Content",
    description:
      "Most platforms explain calculus like you're in high school. University mathematics requires rigour, derivations, and real worked examples.",
  },
  {
    icon: Layers,
    title: "No Structure",
    description:
      "Watching videos or reading textbooks without a system means you forget 70% within a week. There is no feedback loop.",
  },
  {
    icon: Timer,
    title: "Wasted Revision Time",
    description:
      "You do not know what to study next. You end up re-reading everything instead of targeting your actual weak points.",
  },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Choose Your Topic",
    description:
      "Browse 13 university-level subjects from Calculus to ML Mathematics. Search for any subtopic and select it in seconds.",
  },
  {
    number: "02",
    title: "Study by Chapter",
    description:
      "Colqad generates a rigorous textbook-quality summary split into chapters. Formal definitions, derivations, and worked examples — all with proper mathematical notation.",
  },
  {
    number: "03",
    title: "Test Yourself",
    description:
      "After each topic, attempt 12 practice questions across three difficulty levels — beginner, intermediate, and advanced. Rate your confidence on each one.",
  },
  {
    number: "04",
    title: "Track What Is Next",
    description:
      "Based on your performance, Colqad calculates your mastery score and tells you exactly when to review each topic again using spaced repetition. Your knowledge gaps are surfaced automatically.",
  },
];

const featureCards = [
  {
    icon: GraduationCap,
    title: "University-Level Content",
    description:
      "Summaries written at undergraduate level. Formal definitions, proofs, and derivations — not simplified overviews.",
  },
  {
    icon: ListChecks,
    title: "Chapter-Based Learning",
    description:
      "Topics are broken into 2-3 chapters so you build understanding progressively, not all at once.",
  },
  {
    icon: TrendingUp,
    title: "Spaced Repetition",
    description:
      "Colqad schedules your next review based on how well you performed. You study less and remember more.",
  },
  {
    icon: Gauge,
    title: "Mastery Tracking",
    description:
      "See your mastery percentage per topic. Know exactly where you are strong and where you are falling behind.",
  },
  {
    icon: Target,
    title: "Knowledge Gaps",
    description:
      "Your weakest topics are surfaced automatically based on your review history, not guesswork.",
  },
  {
    icon: Compass,
    title: "Colly — Your Study Agent",
    description:
      "Ask Colly anything. Find a topic, start a review, or get a concept explained — all from the dashboard.",
  },
];

const socialProofQuotes = [
  {
    quote:
      "Finally a tool that does not explain integration like I have never seen a derivative. The worked examples are actually at the level my exams expect.",
    source: "Second Year, Mathematics",
  },
  {
    quote:
      "The knowledge gaps feature is what got me. I stopped re-reading chapters I already knew and focused only on what was actually costing me marks.",
    source: "Third Year, Computer Science",
  },
  {
    quote:
      "I used Colqad for my linear algebra module. The spaced repetition reminders kept me consistent in a way I never managed with Anki.",
    source: "Final Year, Data Science",
  },
];

export default async function LandingPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5EFE0]">
      <style>{`html { scroll-behavior: smooth; }`}</style>
      <Script id="landing-fade-in" strategy="afterInteractive">
        {`
          (() => {
            const sections = Array.from(document.querySelectorAll('.js-fade-section'));
            if (!sections.length) return;
            if (!('IntersectionObserver' in window)) {
              sections.forEach((section) => section.classList.add('is-visible'));
              return;
            }
            const observer = new IntersectionObserver(
              (entries) => {
                entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                  }
                });
              },
              { threshold: 0.2 }
            );
            sections.forEach((section) => observer.observe(section));
          })();
        `}
      </Script>

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
            <summary className="list-none cursor-pointer rounded-md border border-[#F5EFE0]/20 p-2 text-[#F5EFE0] marker:content-none">
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

      <main className="pt-16">
        <section className="js-fade-section is-visible min-h-[calc(100vh-4rem)] border-b border-[#F5EFE0]/10 px-4 py-16 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#F5EFE0] sm:text-5xl lg:text-6xl">
              Master University Mathematics. Not just for the exam — for good.
            </h1>
            <p className="mt-6 max-w-[600px] text-base text-[#F5EFE0]/75 sm:text-lg">
              Colqad generates university-level topic summaries, breaks them into structured chapters, and tracks exactly what
              you need to review next — so you stop guessing and start mastering.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/register"
                className="rounded-md bg-[#F5EFE0] px-6 py-3 text-sm font-semibold text-[#0A0A0A] transition hover:bg-[#F5EFE0]/90"
              >
                Get Started Free
              </Link>
              <a
                href="#how-it-works"
                className="rounded-md border border-[#F5EFE0] px-6 py-3 text-sm font-semibold text-[#F5EFE0] transition hover:bg-[#F5EFE0]/10"
              >
                See How It Works
              </a>
            </div>
            <p className="mt-5 text-xs text-[#F5EFE0]/60 sm:text-sm">Trusted by 76+ university students · Free to start</p>

            <div className="mt-10 w-full max-w-2xl rounded-2xl border border-[#F5EFE0]/15 bg-[#1A1A1A] p-6 text-left shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#F5EFE0]/55">Topic Summary</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#F5EFE0]">Differential Calculus</h3>
                </div>
                <span className="rounded-full border border-[#F5EFE0]/20 px-3 py-1 text-xs text-[#F5EFE0]/70">Chapter 1 of 3</span>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-[#F5EFE0]/70">
                  <span>Chapter progress</span>
                  <span>33%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#F5EFE0]/15">
                  <div className="h-2 w-1/3 rounded-full bg-[#F5EFE0]" />
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#F5EFE0]/10 bg-[#0F0F0F] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[#F5EFE0]/55">Formal Definition</p>
                <p className="mt-3 text-sm leading-6 text-[#F5EFE0]/85">
                  The derivative of a function at a point quantifies the instantaneous rate of change of the function at that
                  point.
                </p>
                <p className="mt-4 overflow-x-auto rounded-md bg-black/40 px-3 py-2 font-mono text-sm text-[#F5EFE0]">
                  f&apos;(x) = lim(h→0) [f(x+h) - f(x)] / h
                </p>
              </div>

              <button
                type="button"
                className="mt-5 rounded-md border border-[#F5EFE0]/30 bg-transparent px-4 py-2 text-sm font-semibold text-[#F5EFE0]"
              >
                Next Chapter →
              </button>
            </div>
          </div>
        </section>

        <section className="js-fade-section border-b border-[#F5EFE0]/10 px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5EFE0]/55">THE PROBLEM</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              University math is hard. Most study tools aren&apos;t built for it.
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {problemCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-xl border border-[#F5EFE0]/12 bg-[#1A1A1A] p-6">
                  <Icon className="h-5 w-5 text-[#F5EFE0]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#F5EFE0]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#F5EFE0]/75">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="js-fade-section border-b border-[#F5EFE0]/10 px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5EFE0]/55">HOW IT WORKS</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              A smarter way to study university mathematics
            </h2>

            <div className="relative mt-10 grid gap-6 lg:grid-cols-4">
              <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-9 hidden h-px bg-[#F5EFE0]/20 lg:block" />
              {howItWorksSteps.map((step) => (
                <article key={step.number} className="relative rounded-xl border border-[#F5EFE0]/12 bg-[#111111] p-6">
                  <p className="text-3xl font-bold text-[#F5EFE0]/80">{step.number}</p>
                  <h3 className="mt-3 text-lg font-semibold text-[#F5EFE0]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#F5EFE0]/75">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="js-fade-section border-b border-[#F5EFE0]/10 bg-[#111111] px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5EFE0]/55">WHAT YOU GET</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to go from confused to confident
            </h2>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-xl border border-[#F5EFE0]/12 bg-[#1A1A1A] p-6">
                  <Icon className="h-5 w-5 text-[#F5EFE0]" />
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#F5EFE0]/75">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="js-fade-section border-b border-[#F5EFE0]/10 px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#F5EFE0]/55">WHAT IS COVERED</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">13 university subjects. 65+ subtopics.</h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-[#F5EFE0]/75 sm:text-base">
              Built for students in Mathematics, Computer Science, AI and Machine Learning, Economics, and Finance.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {subjects.map((subject) => (
                <span key={subject} className="rounded-full border border-[#F5EFE0]/40 px-4 py-2 text-sm text-[#F5EFE0]/90">
                  {subject}
                </span>
              ))}
            </div>
            <p className="mt-6 text-xs text-[#F5EFE0]/60 sm:text-sm">New topics added regularly.</p>
          </div>
        </section>

        <section className="js-fade-section border-b border-[#F5EFE0]/10 px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-center text-xs uppercase tracking-[0.2em] text-[#F5EFE0]/55">EARLY USERS</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
              Built for students who take their degree seriously
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {socialProofQuotes.map(({ quote, source }) => (
                <article key={source} className="rounded-xl border border-[#F5EFE0]/12 bg-[#1A1A1A] p-6">
                  <p className="text-4xl leading-none text-[#F5EFE0]/70">“</p>
                  <p className="mt-3 text-sm leading-7 text-[#F5EFE0]/90">{quote}</p>
                  <p className="mt-4 text-xs text-[#F5EFE0]/60">— {source}</p>
                </article>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-[#F5EFE0]/65">Join 76+ students already using Colqad</p>
          </div>
        </section>

        <section className="js-fade-section px-4 py-20 opacity-0 transition-opacity duration-700 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-2xl bg-[#F5EFE0] px-6 py-14 text-center text-[#0A0A0A] sm:px-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start mastering university mathematics today.</h2>
            <p className="mt-4 text-base text-[#0A0A0A]/75">Free to start. No credit card required.</p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex rounded-md bg-[#0A0A0A] px-8 py-3 text-base font-semibold text-[#F5EFE0] transition hover:bg-[#0A0A0A]/90"
              >
                Create Your Free Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#F5EFE0]/10 bg-[#0A0A0A] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#F5EFE0]/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Colqad</p>
          <div className="flex items-center gap-5">
            <a href="#" className="transition hover:text-[#F5EFE0]">
              Privacy Policy
            </a>
            <a href="#" className="transition hover:text-[#F5EFE0]">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
