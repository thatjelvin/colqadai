import {
  chapterSummarySchema,
  parseStoredSummary,
  migrateOldSummaryToNew,
  getPresentSections,
  buildSummaryPrompt,
  type ChapterSummary,
} from "@/lib/learning/summary-schema";

const VALID_NEW: ChapterSummary = {
  overview: "Limits describe how functions behave near a point.",
  prerequisites: ["Algebra", "Functions"],
  definitions: [
    {
      name: "Limit",
      formal_statement: "$\\lim_{x \\to a} f(x) = L$",
      explanation: "f(x) gets arbitrarily close to L as x approaches a.",
      example: "$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$",
    },
  ],
  theorems: [
    {
      name: "Squeeze Theorem",
      statement: "If $g(x) \\le f(x) \\le h(x)$ and both $g$ and $h$ approach $L$, then $f$ approaches $L$.",
      proof_sketch: "Bound $f$ between $g$ and $h$ at every point.",
      key_conditions: ["g, f, h are real-valued", "Both limits equal L"],
    },
  ],
  derivations: [
    {
      result: "$\\frac{d}{dx} x^2 = 2x$",
      steps: [
        { description: "Write the difference quotient", math: "$\\frac{(x+h)^2 - x^2}{h}$" },
        { description: "Expand and cancel", math: "$\\frac{2xh + h^2}{h} = 2x + h$" },
        { description: "Take the limit as h -> 0", math: "$\\lim_{h \\to 0} (2x + h) = 2x$" },
      ],
    },
  ],
  examples: [
    {
      problem: "Compute $\\lim_{x \\to 2} x^2$.",
      solution: "By direct substitution, $2^2 = 4$.",
    },
  ],
  common_mistakes: [
    {
      error: "Plugging in before checking the indeterminate form",
      why: "Limits do not always commute with substitution.",
      fix: "Simplify or use L'Hopital if you get 0/0 or inf/inf.",
    },
  ],
  formula_summary: [
    {
      name: "Power rule",
      formula: "$\\frac{d}{dx} x^n = n x^{n-1}$",
      notes: "Holds for all real n.",
    },
  ],
};

const VALID_OLD = {
  summary: "Limits describe how functions behave near a point.",
  prerequisites: ["Algebra", "Functions"],
  key_concepts: [
    {
      name: "Limit",
      explanation: "f(x) gets arbitrarily close to L as x approaches a.",
      example: "$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$",
    },
    {
      name: "Continuity",
      explanation: "A function is continuous if the limit equals the value at every point.",
      example: "f(x) = x^2 is continuous everywhere.",
    },
    {
      name: "Indeterminate Form",
      explanation: "An expression like 0/0 that does not determine a unique value.",
      example: "$\\frac{x^2 - 1}{x - 1}$ at x=1.",
    },
    {
      name: "Epsilon-Delta",
      explanation: "A formal definition of limits using arbitrarily small distances.",
      example: "For every ε>0 there is a δ>0 such that ...",
    },
  ],
  common_mistakes: [
    "Plugging in before checking the indeterminate form",
    "Forgetting to factor before applying L'Hopital",
  ],
  practice_tip: "Simplify or use L'Hopital if you get 0/0 or inf/inf.",
};

describe("Summary schema", () => {
  describe("chapterSummarySchema", () => {
    it("accepts a fully-populated new summary", () => {
      const result = chapterSummarySchema.safeParse(VALID_NEW);
      expect(result.success).toBe(true);
    });

    it("defaults all optional sections to [] when omitted", () => {
      const result = chapterSummarySchema.safeParse({
        overview: "Quick note",
        prerequisites: ["Algebra"],
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.definitions).toEqual([]);
      expect(result.data.theorems).toEqual([]);
      expect(result.data.derivations).toEqual([]);
      expect(result.data.examples).toEqual([]);
      expect(result.data.common_mistakes).toEqual([]);
      expect(result.data.formula_summary).toEqual([]);
    });

    it("rejects missing overview", () => {
      const result = chapterSummarySchema.safeParse({
        prerequisites: ["Algebra"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parseStoredSummary", () => {
    it("parses a valid new-format summary", () => {
      const result = parseStoredSummary(VALID_NEW);
      expect(result).not.toBeNull();
      expect(result?.overview).toContain("Limits");
    });

    it("migrates an old-format summary to the new shape", () => {
      const result = parseStoredSummary(VALID_OLD);
      expect(result).not.toBeNull();
      expect(result?.overview).toBe(VALID_OLD.summary);
      expect(result?.prerequisites).toEqual(VALID_OLD.prerequisites);
      expect(result?.definitions).toHaveLength(4);
      expect(result?.definitions[0]?.name).toBe("Limit");
      expect(result?.definitions[0]?.formal_statement).toBe("Limit");
      expect(result?.definitions[0]?.example).toBe(VALID_OLD.key_concepts[0]?.example);
      expect(result?.common_mistakes).toHaveLength(2);
      expect(result?.common_mistakes[0]?.error).toBe(VALID_OLD.common_mistakes[0]);
      expect(result?.common_mistakes[0]?.fix).toBe(VALID_OLD.practice_tip);
    });

    it("returns null for garbage input", () => {
      expect(parseStoredSummary(null)).toBeNull();
      expect(parseStoredSummary("string")).toBeNull();
      expect(parseStoredSummary({ random: "object" })).toBeNull();
    });
  });

  describe("migrateOldSummaryToNew", () => {
    it("preserves the old overview as the new overview", () => {
      const migrated = migrateOldSummaryToNew(VALID_OLD);
      expect(migrated.overview).toBe(VALID_OLD.summary);
    });

    it("converts key_concepts into definitions", () => {
      const migrated = migrateOldSummaryToNew(VALID_OLD);
      expect(migrated.definitions).toHaveLength(4);
      expect(migrated.definitions[0]?.explanation).toBe(VALID_OLD.key_concepts[0]?.explanation);
    });

    it("migrates common_mistakes to structured objects", () => {
      const migrated = migrateOldSummaryToNew(VALID_OLD);
      expect(migrated.common_mistakes).toHaveLength(2);
      expect(migrated.common_mistakes[0]?.error).toBe(VALID_OLD.common_mistakes[0]);
      expect(migrated.common_mistakes[0]?.fix).toBe(VALID_OLD.practice_tip);
    });
  });

  describe("getPresentSections", () => {
    it("returns overview when overview is non-empty", () => {
      const sections = getPresentSections({ ...VALID_NEW, definitions: [], theorems: [], derivations: [], examples: [], common_mistakes: [], formula_summary: [] });
      expect(sections).toContain("overview");
      expect(sections).toContain("prerequisites");
      expect(sections).not.toContain("definitions");
    });

    it("returns every non-empty section in order", () => {
      const sections = getPresentSections(VALID_NEW);
      expect(sections).toEqual([
        "overview",
        "prerequisites",
        "definitions",
        "theorems",
        "derivations",
        "examples",
        "common_mistakes",
        "formula_summary",
      ]);
    });

    it("skips empty arrays", () => {
      const sections = getPresentSections({
        overview: "Hi",
        prerequisites: [],
        definitions: [],
        theorems: [],
        derivations: [],
        examples: [],
        common_mistakes: [],
        formula_summary: [],
      });
      expect(sections).toEqual(["overview"]);
    });
  });

  describe("buildSummaryPrompt", () => {
    it("includes the subtopic and parent topic name", () => {
      const prompt = buildSummaryPrompt("Limits", "Calculus");
      expect(prompt).toContain("Limits");
      expect(prompt).toContain("Calculus");
    });

    it("specifies all new structured sections", () => {
      const prompt = buildSummaryPrompt("Limits", "Calculus");
      expect(prompt).toContain("definitions");
      expect(prompt).toContain("theorems");
      expect(prompt).toContain("derivations");
      expect(prompt).toContain("examples");
      expect(prompt).toContain("common_mistakes");
      expect(prompt).toContain("formula_summary");
    });
  });
});
