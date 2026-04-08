import {
  chunkText,
  extractPdfText,
  generateConcepts,
  generateGroundedSummary,
  normalizeSourceText,
} from "@/lib/notebooks/processing";

describe("Notebook source processing", () => {
  it("normalizes and chunks source text", () => {
    const text = "Line one.\n\n\nLine two with extra   spaces.".repeat(80);
    const chunks = chunkText(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toContain("Line one");
  });

  it("extracts text tokens from PDF streams", () => {
    const fakePdf = Buffer.from("stream\n(Integration by parts) Tj\n(Series convergence) Tj\nendstream", "latin1");
    const extracted = extractPdfText(fakePdf);

    expect(extracted).toContain("Integration by parts");
    expect(extracted).toContain("Series convergence");
  });

  it("builds grounded summary with source chunk references", () => {
    const chunks = [
      { id: "c1", content: normalizeSourceText("Derivative rules explain how slopes change in functions.") },
      { id: "c2", content: normalizeSourceText("Integration techniques reverse derivatives and compute area under curves.") },
    ];

    const summary = generateGroundedSummary(chunks);

    expect(summary.summary.length).toBeGreaterThan(20);
    expect(summary.sourceChunkIds.length).toBeGreaterThan(0);
  });

  it("extracts concept candidates with evidence", () => {
    const concepts = generateConcepts([
      { id: "c1", content: "Matrix multiplication combines vectors in Linear Algebra." },
      { id: "c2", content: "Vector projections rely on matrix operations and vector norms." },
    ]);

    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts[0].evidenceChunkIds.length).toBeGreaterThan(0);
  });
});
