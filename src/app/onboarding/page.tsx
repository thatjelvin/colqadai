"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepOption = {
  value: string;
  label: string;
  emoji: string;
  description?: string;
};

type Step = {
  id: number;
  question: string;
  field: "course" | "grade" | "challenge" | "source";
  options: StepOption[];
};

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 1,
    question: "What are you studying?",
    field: "course",
    options: [
      { value: "Mathematics", label: "Mathematics", emoji: "∑", description: "Pure & applied maths" },
      { value: "Physics", label: "Physics", emoji: "⚛️", description: "Mechanics, waves & beyond" },
      { value: "Engineering", label: "Engineering", emoji: "⚙️", description: "All engineering disciplines" },
      { value: "Computer Science", label: "Computer Science", emoji: "💻", description: "Algorithms, systems & AI" },
      { value: "Statistics", label: "Statistics", emoji: "📊", description: "Probability & data analysis" },
      { value: "Other STEM", label: "Other STEM", emoji: "🔬", description: "Chemistry, biology & more" },
    ],
  },
  {
    id: 2,
    question: "What's your level?",
    field: "grade",
    options: [
      { value: "First Year", label: "First Year", emoji: "🌱", description: "Just getting started" },
      { value: "Second Year", label: "Second Year", emoji: "📚", description: "Building momentum" },
      { value: "Third Year", label: "Third Year", emoji: "🎯", description: "Deep into the content" },
      { value: "Final Year", label: "Final Year", emoji: "🏁", description: "The final push" },
      { value: "Postgraduate", label: "Postgraduate", emoji: "🎓", description: "Masters / PhD" },
    ],
  },
  {
    id: 3,
    question: "What's your biggest challenge with math?",
    field: "challenge",
    options: [
      { value: "Understanding concepts", label: "Understanding concepts", emoji: "🤔", description: "Grasping what things mean" },
      { value: "Exam pressure", label: "Exam pressure", emoji: "😰", description: "Nerves and time pressure" },
      { value: "Keeping up with coursework", label: "Keeping up", emoji: "🏃", description: "Staying on top of it all" },
      { value: "Practicing enough", label: "Practicing enough", emoji: "✏️", description: "Finding time to drill problems" },
      { value: "Remembering formulas", label: "Remembering formulas", emoji: "🧠", description: "Recall under pressure" },
    ],
  },
  {
    id: 4,
    question: "How did you hear about Colqad?",
    field: "source",
    options: [
      { value: "Friend / Classmate", label: "Friend or Classmate", emoji: "👥", description: "Word of mouth" },
      { value: "Reddit", label: "Reddit", emoji: "🤖", description: "Found it on a subreddit" },
      { value: "Instagram / TikTok", label: "Instagram / TikTok", emoji: "📱", description: "Saw it on social media" },
      { value: "Lecturer recommended it", label: "My lecturer", emoji: "👨‍🏫", description: "Recommended in class" },
      { value: "Just found it", label: "Just found it", emoji: "🔍", description: "Search or browsing" },
    ],
  },
];

// ─── Option card ──────────────────────────────────────────────────────────────

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: StepOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
          ✓
        </span>
      )}
      <span className="text-3xl leading-none" role="img" aria-hidden>
        {option.emoji}
      </span>
      <span className="text-sm font-semibold leading-tight">{option.label}</span>
      {option.description && (
        <span className="text-xs text-muted-foreground leading-tight">{option.description}</span>
      )}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < current ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

// ─── All-set screen ───────────────────────────────────────────────────────────

function AllSetScreen({
  name,
  onStart,
  loading,
}: {
  name: string | null;
  onStart: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="text-6xl" role="img" aria-label="Celebration">
        🎉
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">
          You&apos;re all set{name ? `, ${name.split(" ")[0]}` : ""}!
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Colqad is personalised and ready. Your first review session is waiting — let&apos;s build that streak.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Setting up…" : "Start Learning →"}
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed; STEPS.length = done screen
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[currentStep];
  const isDoneScreen = currentStep === STEPS.length;
  const selectedValue = step ? answers[step.field] : null;

  const selectOption = (value: string) => {
    if (!step) return;
    setAnswers((prev) => ({ ...prev, [step.field]: value }));
  };

  const goNext = () => {
    if (!step) return;
    if (!answers[step.field]) return; // guard
    setCurrentStep((s) => s + 1);
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: answers.grade ?? "",
          course: answers.course ?? "",
          source: answers.source,
          challenge: answers.challenge,
        }),
      });
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to save your details. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo / brand */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight">Colqad</span>
        </div>

        <div className="rounded-3xl border bg-card shadow-lg p-8">
          {isDoneScreen ? (
            <>
              {error && <p className="mb-4 text-sm text-destructive text-center">{error}</p>}
              <AllSetScreen name={null} onStart={submit} loading={loading} />
            </>
          ) : (
            <>
              {/* Progress */}
              <StepProgress current={currentStep} total={STEPS.length} />

              {/* Step counter */}
              <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                Step {currentStep + 1} of {STEPS.length}
              </p>

              {/* Question */}
              <h2 className="text-xl font-bold mb-6">{step.question}</h2>

              {/* Options grid */}
              <div
                className={`grid gap-3 mb-8 ${
                  step.options.length >= 5
                    ? "grid-cols-2 sm:grid-cols-3"
                    : "grid-cols-2"
                }`}
              >
                {step.options.map((opt) => (
                  <OptionCard
                    key={opt.value}
                    option={opt}
                    selected={selectedValue === opt.value}
                    onSelect={() => selectOption(opt.value)}
                  />
                ))}
              </div>

              {/* Error */}
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

              {/* Next button */}
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedValue}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentStep === STEPS.length - 1 ? "Almost done →" : "Next →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
