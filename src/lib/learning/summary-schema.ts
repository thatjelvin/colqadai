import { z } from "zod";

export const definitionSchema = z.object({
  name: z.string().min(1),
  formal_statement: z.string().min(1),
  explanation: z.string().min(1),
  example: z.string().min(1).optional(),
});

export const theoremSchema = z.object({
  name: z.string().min(1),
  statement: z.string().min(1),
  proof_sketch: z.string().min(1).optional(),
  key_conditions: z.array(z.string().min(1)).default([]),
});

export const derivationStepSchema = z.object({
  description: z.string().min(1),
  math: z.string().min(1),
});

export const derivationSchema = z.object({
  result: z.string().min(1),
  steps: z.array(derivationStepSchema).min(1),
});

export const exampleSchema = z.object({
  problem: z.string().min(1),
  solution: z.string().min(1),
});

export const commonMistakeSchema = z.object({
  error: z.string().min(1),
  why: z.string().min(1),
  fix: z.string().min(1),
});

export const formulaSummarySchema = z.object({
  name: z.string().min(1),
  formula: z.string().min(1),
  notes: z.string().optional(),
});

export const chapterSummarySchema = z.object({
  overview: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).default([]),
  definitions: z.array(definitionSchema).default([]),
  theorems: z.array(theoremSchema).default([]),
  derivations: z.array(derivationSchema).default([]),
  examples: z.array(exampleSchema).default([]),
  common_mistakes: z.array(commonMistakeSchema).default([]),
  formula_summary: z.array(formulaSummarySchema).default([]),
});

export type ChapterSummary = z.infer<typeof chapterSummarySchema>;
export type Definition = z.infer<typeof definitionSchema>;
export type Theorem = z.infer<typeof theoremSchema>;
export type Derivation = z.infer<typeof derivationSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type CommonMistake = z.infer<typeof commonMistakeSchema>;
export type FormulaSummary = z.infer<typeof formulaSummarySchema>;

const oldKeyConceptSchema = z.object({
  name: z.string().min(1),
  explanation: z.string().min(1),
  example: z.string().min(1),
});

const oldSummarySchema = z.object({
  summary: z.string().min(1),
  prerequisites: z.array(z.string().min(1)).min(2).max(4),
  key_concepts: z.array(oldKeyConceptSchema).min(4).max(6),
  common_mistakes: z.array(z.string().min(1)).min(2).max(3),
  practice_tip: z.string().min(1),
});

type OldSummary = z.infer<typeof oldSummarySchema>;

export function migrateOldSummaryToNew(old: OldSummary): ChapterSummary {
  return {
    overview: old.summary,
    prerequisites: old.prerequisites,
    definitions: old.key_concepts.map((c) => ({
      name: c.name,
      formal_statement: c.name,
      explanation: c.explanation,
      example: c.example,
    })),
    theorems: [],
    derivations: [],
    examples: old.key_concepts.slice(0, 2).map((c) => ({
      problem: c.example,
      solution: c.explanation,
    })),
    common_mistakes: old.common_mistakes.map((error) => ({
      error,
      why: "Students often make this mistake when first learning the topic.",
      fix: old.practice_tip,
    })),
    formula_summary: [],
  };
}

export type SummarySectionId =
  | "overview"
  | "prerequisites"
  | "definitions"
  | "theorems"
  | "derivations"
  | "examples"
  | "common_mistakes"
  | "formula_summary";

export const SECTION_LABELS: Record<SummarySectionId, string> = {
  overview: "Overview",
  prerequisites: "Prerequisites",
  definitions: "Definitions",
  theorems: "Theorems",
  derivations: "Derivations",
  examples: "Worked Examples",
  common_mistakes: "Common Mistakes",
  formula_summary: "Formula Sheet",
};

export function getPresentSections(summary: ChapterSummary): SummarySectionId[] {
  const present: SummarySectionId[] = [];
  if (summary.overview) present.push("overview");
  if (summary.prerequisites.length > 0) present.push("prerequisites");
  if (summary.definitions.length > 0) present.push("definitions");
  if (summary.theorems.length > 0) present.push("theorems");
  if (summary.derivations.length > 0) present.push("derivations");
  if (summary.examples.length > 0) present.push("examples");
  if (summary.common_mistakes.length > 0) present.push("common_mistakes");
  if (summary.formula_summary.length > 0) present.push("formula_summary");
  return present;
}

export function parseStoredSummary(data: unknown): ChapterSummary | null {
  const newResult = chapterSummarySchema.safeParse(data);
  if (newResult.success) return newResult.data;

  const oldResult = oldSummarySchema.safeParse(data);
  if (oldResult.success) {
    return migrateOldSummaryToNew(oldResult.data);
  }

  return null;
}

export function buildSummaryPrompt(subtopicName: string, parentTopicName: string): string {
  return `Generate a structured learning summary for the subtopic "${subtopicName}" which is part of the parent topic "${parentTopicName}".

Return a JSON object with exactly this structure:
{
  "overview": "2-3 sentence plain-English overview of what this topic is and why it matters",
  "prerequisites": ["array of 2-4 topic names the student should know first"],
  "definitions": [
    {
      "name": "concept name",
      "formal_statement": "the formal definition or mathematical statement (use LaTeX)",
      "explanation": "2-3 sentence intuitive explanation for a first or second year student",
      "example": "small example illustrating the concept (optional, use LaTeX)"
    }
  ],
  "theorems": [
    {
      "name": "theorem name",
      "statement": "the theorem's statement (use LaTeX)",
      "proof_sketch": "brief sketch of the proof (optional, use LaTeX)",
      "key_conditions": ["array of hypotheses or conditions required (optional)"]
    }
  ],
  "derivations": [
    {
      "result": "the formula or result being derived (use LaTeX)",
      "steps": [
        { "description": "what we are doing in this step", "math": "the LaTeX math expression for this step" }
      ]
    }
  ],
  "examples": [
    {
      "problem": "the problem statement (use LaTeX)",
      "solution": "the worked solution (use LaTeX)"
    }
  ],
  "common_mistakes": [
    {
      "error": "the mistake students make",
      "why": "why students make this mistake",
      "fix": "how to avoid or correct it"
    }
  ],
  "formula_summary": [
    {
      "name": "formula name",
      "formula": "the LaTeX expression",
      "notes": "when to use it or key assumptions (optional)"
    }
  ]
}

Aim for 3-5 definitions, 1-3 theorems, 0-3 derivations, 2-4 examples, 2-4 common mistakes, 2-5 formulas. Use LaTeX for math: $...$ for inline, $$...$$ for display. Keep language accessible to a first or second year university student.`;
}
