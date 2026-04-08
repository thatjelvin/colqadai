import { buildInterleavedQueue } from "@/lib/learning/interleaving";

describe("Interleaved practice queue", () => {
  it("avoids consecutive same-topic items when alternatives exist", () => {
    const queue = buildInterleavedQueue([
      { id: "1", topicSlug: "calc", nextReviewAt: new Date(Date.now() - 86400000) },
      { id: "2", topicSlug: "calc", nextReviewAt: new Date(Date.now() - 86400000 * 2) },
      { id: "3", topicSlug: "algebra", nextReviewAt: new Date(Date.now() - 86400000 * 3) },
      { id: "4", topicSlug: "stats", nextReviewAt: new Date(Date.now() - 86400000 * 4) },
    ]);

    for (let i = 1; i < queue.length; i++) {
      const previous = queue[i - 1];
      const current = queue[i];

      if (previous.topicSlug !== current.topicSlug) {
        expect(current.topicSlug).not.toBe(previous.topicSlug);
      }
    }
  });

  it("keeps all items in output", () => {
    const input = [
      { id: "1", topicTag: "a", nextReviewAt: null },
      { id: "2", topicTag: "b", nextReviewAt: null },
      { id: "3", topicTag: "a", nextReviewAt: null },
    ];

    const queue = buildInterleavedQueue(input);
    expect(queue).toHaveLength(input.length);
  });
});
