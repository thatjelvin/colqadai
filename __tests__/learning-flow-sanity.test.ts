import { chunkText, generateConcepts, generateGroundedSummary } from "@/lib/notebooks/processing";
import { calculateSM2 } from "@/lib/sm2";
import { buildInterleavedQueue } from "@/lib/learning/interleaving";

describe("Core learning flow sanity", () => {
  it("covers source -> summary -> concepts -> review scheduling -> interleaving", () => {
    const source = `
      Integration by parts transforms integrals of products.
      Series convergence tests determine whether infinite sums converge.
      Matrix multiplication combines linear transformations in sequence.
    `;

    const chunks = chunkText(source).map((content, index) => ({ id: `chunk-${index}`, content }));
    expect(chunks.length).toBeGreaterThan(0);

    const summary = generateGroundedSummary(chunks);
    expect(summary.summary).toContain("integrals");
    expect(summary.sourceChunkIds.length).toBeGreaterThan(0);

    const concepts = generateConcepts(chunks);
    expect(concepts.some((concept) => concept.name.toLowerCase().includes("integration"))).toBe(true);

    const reviewed = calculateSM2({ easeFactor: 2.5, interval: 1, repetitions: 0 }, 4);
    expect(reviewed.interval).toBeGreaterThanOrEqual(1);
    expect(reviewed.nextReviewAt.getTime()).toBeGreaterThan(Date.now());

    const queue = buildInterleavedQueue([
      { id: "p1", topicSlug: "calculus", nextReviewAt: reviewed.nextReviewAt },
      { id: "p2", topicSlug: "series", nextReviewAt: new Date(Date.now() - 86400000) },
      { id: "p3", topicSlug: "algebra", nextReviewAt: new Date(Date.now() - 172800000) },
    ]);

    expect(queue).toHaveLength(3);
    expect(new Set(queue.map((item) => item.topicSlug)).size).toBeGreaterThan(1);
  });
});
