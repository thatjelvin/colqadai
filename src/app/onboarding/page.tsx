"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepOption = {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
  logoSvg?: React.ReactNode;
};

type Step = {
  id: number;
  question: string;
  field: "course" | "grade" | "challenge" | "source" | "goal" | "pace" | "diagnostic";
  options: StepOption[];
  variant?: "cards" | "logos";
  questions?: DiagnosticQuestion[]; // For diagnostic step
};

type DiagnosticQuestion = {
  id: number;
  question: string;
  options: {
    id: string;
    text: string;
    correctness: number; // 0-2 points based on difficulty
    topic: string;
  }[];
};

// ─── Course list ─────────────────────────────────────────────────────────────

type CourseGroup = { group: string; courses: string[] };

const COURSE_GROUPS: CourseGroup[] = [
  {
    group: "Mathematics & Statistics",
    courses: [
      "Pure Mathematics",
      "Applied Mathematics",
      "Statistics",
      "Data Science",
      "Actuarial Science",
      "Mathematical Finance",
      "Operational Research",
    ],
  },
  {
    group: "Engineering",
    courses: [
      "Mechanical Engineering",
      "Electrical Engineering",
      "Civil Engineering",
      "Chemical Engineering",
      "Aerospace Engineering",
      "Structural Engineering",
      "Electronics Engineering",
      "Biomedical Engineering",
    ],
  },
  {
    group: "Physical Sciences",
    courses: ["Physics", "Astrophysics", "Chemistry", "Materials Science", "Geophysics"],
  },
  {
    group: "Computing",
    courses: [
      "Computer Science",
      "Software Engineering",
      "Artificial Intelligence",
      "Cybersecurity",
      "Information Systems",
      "Data Engineering",
    ],
  },
  {
    group: "Economics & Finance",
    courses: ["Economics", "Econometrics", "Finance", "Accounting", "Quantitative Finance"],
  },
  {
    group: "Other",
    courses: ["Architecture", "Pharmacy", "Nursing (with stats)", "Other"],
  },
];

// ─── Searchable course combobox ──────────────────────────────────────────────

function CourseCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [isOtherSelected, setIsOtherSelected] = useState(value === "Other" || (!!value && !COURSE_GROUPS.flatMap((g) => g.courses).includes(value)));
  const [otherText, setOtherText] = useState(isOtherSelected ? value : "");
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = isOtherSelected && otherText ? otherText : value;

  const filtered = query.trim()
    ? COURSE_GROUPS.map((g) => ({
        group: g.group,
        courses: g.courses.filter((c) =>
          c.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter((g) => g.courses.length > 0)
    : COURSE_GROUPS;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectCourse = (course: string) => {
    if (course === "Other") {
      setIsOtherSelected(true);
      onChange("Other");
    } else {
      setIsOtherSelected(false);
      setOtherText("");
      onChange(course);
    }
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger / search input */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between rounded-xl border-2 bg-card px-4 py-3 text-left text-sm transition-colors ${
          open ? "border-primary" : "border-border hover:border-primary/40"
        }`}
      >
        <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
          {value ? displayValue : "Search for your course…"}
        </span>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-card shadow-lg">
          {/* Search field */}
          <div className="p-2 border-b">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* Options */}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted-foreground">No courses found.</p>
            )}
            {filtered.map((g) => (
              <div key={g.group}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.group}
                </p>
                {g.courses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    onClick={() => selectCourse(course)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${
                      value === course ? "bg-primary/10 font-semibold text-primary" : ""
                    }`}
                  >
                    {course}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Free-text input for "Other" */}
      {isOtherSelected && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => {
            const text = e.target.value;
            setOtherText(text);
            // Store the actual typed course name, or "Other" if still empty
            onChange(text.trim() || "Other");
          }}
          placeholder="Tell us your course…"
          className="mt-2 w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
        />
      )}
    </div>
  );
}

// ─── Platform logo SVGs ───────────────────────────────────────────────────────

const PLATFORM_OPTIONS: StepOption[] = [
  {
    value: "LinkedIn",
    label: "LinkedIn",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#0A66C2" xmlns="http://www.w3.org/2000/svg">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    value: "Instagram",
    label: "Instagram",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFDC80" />
            <stop offset="26%" stopColor="#FCAF45" />
            <stop offset="50%" stopColor="#F77737" />
            <stop offset="74%" stopColor="#F56040" />
            <stop offset="87%" stopColor="#FD1D1D" />
            <stop offset="100%" stopColor="#833AB4" />
          </linearGradient>
        </defs>
        <path
          fill="url(#ig-grad)"
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
        />
      </svg>
    ),
  },
  {
    value: "Facebook",
    label: "Facebook",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    value: "Reddit",
    label: "Reddit",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="#FF4500" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    value: "X / Twitter",
    label: "X / Twitter",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    value: "Google",
    label: "Google",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    value: "Word of mouth",
    label: "Word of mouth",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    value: "Other",
    label: "Other",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.5} xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
];

// ─── Diagnostic Questions ────────────────────────────────────────────────────

const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 1,
    question: "What is the value of x in the equation 2x + 5 = 15?",
    options: [
      { id: "a", text: "x = 3", correctness: 0, topic: "algebra" },
      { id: "b", text: "x = 5", correctness: 2, topic: "algebra" },
      { id: "c", text: "x = 7", correctness: 0, topic: "algebra" },
      { id: "d", text: "x = 10", correctness: 0, topic: "algebra" },
    ],
  },
  {
    id: 2,
    question: "What is the derivative of f(x) = x² + 3x + 2?",
    options: [
      { id: "a", text: "f'(x) = 2x", correctness: 0, topic: "calculus" },
      { id: "b", text: "f'(x) = 2x + 3", correctness: 2, topic: "calculus" },
      { id: "c", text: "f'(x) = x² + 3", correctness: 0, topic: "calculus" },
      { id: "d", text: "f'(x) = 2x + 2", correctness: 0, topic: "calculus" },
    ],
  },
  {
    id: 3,
    question: "What is the area of a triangle with base 8 cm and height 5 cm?",
    options: [
      { id: "a", text: "13 cm²", correctness: 0, topic: "geometry" },
      { id: "b", text: "20 cm²", correctness: 0, topic: "geometry" },
      { id: "c", text: "40 cm²", correctness: 0, topic: "geometry" },
      { id: "d", text: "20 cm²", correctness: 2, topic: "geometry" },
    ],
  },
  {
    id: 4,
    question: "What is the limit as x approaches 0 of sin(x)/x?",
    options: [
      { id: "a", text: "0", correctness: 0, topic: "calculus" },
      { id: "b", text: "1", correctness: 2, topic: "calculus" },
      { id: "c", text: "∞", correctness: 0, topic: "calculus" },
      { id: "d", text: "Does not exist", correctness: 0, topic: "calculus" },
    ],
  },
  {
    id: 5,
    question: "If P(A) = 0.4 and P(B) = 0.5, and A and B are independent, what is P(A ∩ B)?",
    options: [
      { id: "a", text: "0.1", correctness: 0, topic: "statistics" },
      { id: "b", text: "0.2", correctness: 2, topic: "statistics" },
      { id: "c", text: "0.6", correctness: 0, topic: "statistics" },
      { id: "d", text: "0.9", correctness: 0, topic: "statistics" },
    ],
  },
  {
    id: 6,
    question: "What is the integral of f(x) = 3x² dx?",
    options: [
      { id: "a", text: "x³ + C", correctness: 2, topic: "calculus" },
      { id: "b", text: "3x + C", correctness: 0, topic: "calculus" },
      { id: "c", text: "6x + C", correctness: 0, topic: "calculus" },
      { id: "d", text: "x² + C", correctness: 0, topic: "calculus" },
    ],
  },
  {
    id: 7,
    question: "What is the slope of the line passing through points (2, 3) and (5, 9)?",
    options: [
      { id: "a", text: "1", correctness: 0, topic: "algebra" },
      { id: "b", text: "2", correctness: 2, topic: "algebra" },
      { id: "c", text: "3", correctness: 0, topic: "algebra" },
      { id: "d", text: "4", correctness: 0, topic: "algebra" },
    ],
  },
  {
    id: 8,
    question: "What is the value of log₂(8)?",
    options: [
      { id: "a", text: "2", correctness: 0, topic: "algebra" },
      { id: "b", text: "3", correctness: 2, topic: "algebra" },
      { id: "c", text: "4", correctness: 0, topic: "algebra" },
      { id: "d", text: "8", correctness: 0, topic: "algebra" },
    ],
  },
  {
    id: 9,
    question: "What is the standard deviation of the data set: 2, 4, 4, 4, 5, 5, 7, 9?",
    options: [
      { id: "a", text: "1.5", correctness: 0, topic: "statistics" },
      { id: "b", text: "2.0", correctness: 2, topic: "statistics" },
      { id: "c", text: "2.5", correctness: 0, topic: "statistics" },
      { id: "d", text: "3.0", correctness: 0, topic: "statistics" },
    ],
  },
  {
    id: 10,
    question: "If f(x) = eˣ, what is f'(x)?",
    options: [
      { id: "a", text: "eˣ", correctness: 2, topic: "calculus" },
      { id: "b", text: "xeˣ", correctness: 0, topic: "calculus" },
      { id: "c", text: "eˣ⁺¹", correctness: 0, topic: "calculus" },
      { id: "d", text: "1", correctness: 0, topic: "calculus" },
    ],
  },
];

// ─── Step definitions ────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 1,
    question: "What are you studying?",
    field: "course",
    options: [], // handled by CourseCombobox
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
    question: "What's your main goal for using Colqad?",
    field: "goal",
    options: [
      { value: "Exam preparation", label: "Exam preparation", emoji: "📝", description: "Prepare for upcoming exams" },
      { value: "Course support", label: "Course support", emoji: "📚", description: "Keep up with current coursework" },
      { value: "Self-study", label: "Self-study", emoji: "🔍", description: "Learn topics independently" },
      { value: "Skill improvement", label: "Skill improvement", emoji: "💪", description: "Get better at math overall" },
    ],
  },
  {
    id: 5,
    question: "What's your preferred learning pace?",
    field: "pace",
    options: [
      { value: "Relaxed", label: "Relaxed", emoji: "😌", description: "Take time to understand concepts deeply" },
      { value: "Balanced", label: "Balanced", emoji: "⚖️", description: "Steady progress with regular practice" },
      { value: "Intensive", label: "Intensive", emoji: "💥", description: "Fast-paced learning with lots of practice" },
    ],
  },
  {
    id: 6,
    question: "Let's assess your math skills with a quick diagnostic quiz",
    field: "diagnostic",
    options: [],
    questions: DIAGNOSTIC_QUESTIONS,
  },
  {
    id: 7,
    question: "How did you hear about Colqad?",
    field: "source",
    options: PLATFORM_OPTIONS,
    variant: "logos",
  },
];

// ─── Option card (emoji style) ────────────────────────────────────────────────

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

// ─── Logo card (platform style) ───────────────────────────────────────────────

function LogoCard({
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
      className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary aspect-square ${
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
      <span className="flex items-center justify-center">{option.logoSvg}</span>
      <span className="text-xs font-semibold leading-tight">{option.label}</span>
    </button>
  );
}

// ─── Diagnostic question component ───────────────────────────────────────────

function DiagnosticQuestionCard({
  question,
  selectedOption,
  onOptionSelect,
}: {
  question: DiagnosticQuestion;
  selectedOption: string | null;
  onOptionSelect: (questionId: number, optionId: string) => void;
}) {
  return (
    <div className="border rounded-xl border-border p-6 mb-4">
      <h3 className="text-lg font-medium mb-4">{question.question}</h3>
      <div className="space-y-3">
        {question.options.map((option) => (
          <label
            key={option.id}
            className={`flex items-start gap-3 p-3 rounded-lg border border-${selectedOption === option.id ? "primary" : "border"} ${
              selectedOption === option.id ? "bg-primary/5" : "bg-card"
            } cursor-pointer hover:border-primary/40 transition-colors`}
            onClick={() => onOptionSelect(question.id, option.id)}
          >
            <div className="flex-shrink-0 flex h-5 w-5 items-center justify-center">
              {selectedOption === option.id && (
                <span className="text-primary text-sm">●</span>
              )}
            </div>
            <div>
              <p className="font-medium">{option.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Topic: {option.topic}
              </p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────────────────

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

// ─── All-set screen ─────────────────────────────────────────────────────────

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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed; STEPS.length = done screen
  const [answers, setAnswers] = useState<Record<string, string | string[] | number | null>>({});
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[currentStep];
  const isDoneScreen = currentStep === STEPS.length;
  const selectedValue = step ? answers[step.field] : null;

  const selectOption = (value: string) => {
    if (!step) return;
    setAnswers((prev) => ({ ...prev, [step.field]: value }));
  };

  const selectDiagnosticOption = (questionId: number, optionId: string) => {
    setDiagnosticAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const goNext = () => {
    if (!step) return;

    // Validate current step
    if (step.field === "diagnostic") {
      // Check if all diagnostic questions are answered
      const answeredCount = Object.keys(diagnosticAnswers).length;
      if (answeredCount < DIAGNOSTIC_QUESTIONS.length) {
        setError("Please answer all questions before continuing");
        return;
      }
    } else if (!step.field.match(/course|source/) && !selectedValue) {
      // For non-course/source steps, check if a value is selected
      setError("Please select an option before continuing");
      return;
    }

    setCurrentStep((s) => s + 1);
    setError(null);
  };

  const calculateDiagnosticScore = () => {
    let totalScore = 0;
    let maxScore = 0;

    DIAGNOSTIC_QUESTIONS.forEach((question) => {
      const selectedOptionId = diagnosticAnswers[question.id];
      if (selectedOptionId) {
        const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
        if (selectedOption) {
          totalScore += selectedOption.correctness;
        }
      }
      maxScore += 2; // Each question is worth up to 2 points
    });

    // Convert to 0-10 scale
    return Math.round((totalScore / maxScore) * 10);
  };

  const determineRecommendations = (score: number) => {
    let recommendedTopic = "limits-continuity"; // Default starting point
    let difficultyLevel = 1; // Default beginner level

    if (score >= 0 && score <= 3) {
      // Struggling with basics - start with pre-calculus concepts
      recommendedTopic = "algebra-basics"; // We'd need to add this to topics
      difficultyLevel = 1;
    } else if (score >= 4 && score <= 6) {
      recommendedTopic = "limits-continuity";
      difficultyLevel = 2;
    } else {
      // Good understanding - can start with calculus
      recommendedTopic = "differential-calculus";
      difficultyLevel = 3;
    }

    return { recommendedTopic, difficultyLevel };
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate diagnostic score and recommendations
      const diagnosticScore = step.field === "diagnostic" ? calculateDiagnosticScore() : null;
      const { recommendedTopic, difficultyLevel } = diagnosticScore !== null
        ? determineRecommendations(diagnosticScore)
        : { recommendedTopic: null, difficultyLevel: null };

      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: answers.grade ?? "",
          course: answers.course ?? "",
          source: answers.source,
          challenge: answers.challenge,
          goal: answers.goal,
          pace: answers.pace,
          diagnosticScore,
          recommendedTopic,
          difficultyLevel,
          diagnosticAnswers: Object.values(diagnosticAnswers),
        }),
      });

      if (res.ok) {
        // Advance to the done screen only after a confirmed save.
        setCurrentStep(STEPS.length);
        setLoading(false);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Onboarding API error:", data);
        setError(data?.error ?? "Failed to save your details. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Onboarding submit failed:", err);
      setError("Something went wrong. Please check your connection and try again.");
      setLoading(false);
    }
  };

  // Step 1 uses the searchable combobox — selectedValue guard needs special handling
  const canProceed =
    step?.field === "course"
      ? !!answers.course
      : step.field === "diagnostic"
        ? Object.keys(diagnosticAnswers).length === DIAGNOSTIC_QUESTIONS.length
        : step.field === "source"
          ? true
          : !!selectedValue;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo / brand */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight">Colqad</span>
        </div>

        <div className="rounded-3xl border bg-card shadow-lg p-8">
          {isDoneScreen ? (
            <AllSetScreen
              name={null}
              onStart={async () => {
                // router.refresh() is not awaitable in Next.js App Router — it fires
                // a background RSC re-fetch.  The 100 ms pause gives that request time
                // to complete so the dashboard layout reads fresh data (onboarding_completed
                // = true) instead of the stale cached value that would cause a redirect loop.
                router.refresh();
                await new Promise((res) => setTimeout(res, 100));
                router.push("/dashboard");
              }}
              loading={false}
            />
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

              {/* Step 1: searchable combobox */}
              {step.field === "course" ? (
                <div className="mb-8">
                  <CourseCombobox
                    value={typeof answers.course === "string" ? answers.course : ""}
                    onChange={(val) => setAnswers((prev) => ({ ...prev, course: val }))}
                  />
                </div>
              ) : step.field === "diagnostic" ? (
                /* Step 6: diagnostic quiz */
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Answer all 10 questions to help us place you at the right level.
                  </p>
                  {DIAGNOSTIC_QUESTIONS.map((question) => (
                    <DiagnosticQuestionCard
                      key={question.id}
                      question={question}
                      selectedOption={diagnosticAnswers[question.id]}
                      onOptionSelect={selectDiagnosticOption}
                    />
                  ))}
                  <div className="text-right text-sm text-muted-foreground">
                    {Object.keys(diagnosticAnswers).length}/{DIAGNOSTIC_QUESTIONS.length} completed
                  </div>
                </div>
              ) : step.variant === "logos" ? (
                /* Step 7: logo cards */
                <div className="grid grid-cols-4 gap-3 mb-8">
                  {step.options.map((opt) => (
                    <LogoCard
                      key={opt.value}
                      option={opt}
                      selected={selectedValue === opt.value}
                      onSelect={() => selectOption(opt.value)}
                    />
                  ))}
                </div>
              ) : (
                /* Default: emoji option cards */
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
              )}

              {/* Error */}
              {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

              {/* Next / submit button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={currentStep === STEPS.length - 1 ? submit : goNext}
                  disabled={!canProceed || loading}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {currentStep === STEPS.length - 1
                    ? loading ? "Saving…" : "Finish setup →"
                    : "Next →"}
                </button>
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground transition hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}