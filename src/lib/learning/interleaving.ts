type QueueCandidate<T> = {
  topicKey: string;
  urgency: number;
  payload: T;
};

function urgencyFromDate(nextReviewAt?: Date | null): number {
  if (!nextReviewAt) return 1;

  const now = Date.now();
  const dueAt = nextReviewAt.getTime();

  if (dueAt > now) return 1;

  const overdueDays = Math.max(1, Math.floor((now - dueAt) / 86400000));
  return 1 + overdueDays;
}

export function buildInterleavedQueue<T extends { topicTag?: string | null; topicSlug?: string | null; nextReviewAt?: Date | null }>(
  items: T[]
): T[] {
  const buckets = new Map<string, QueueCandidate<T>[]>();

  for (const item of items) {
    const topicKey = item.topicTag || item.topicSlug || "mixed";
    if (!buckets.has(topicKey)) {
      buckets.set(topicKey, []);
    }

    buckets.get(topicKey)?.push({
      topicKey,
      urgency: urgencyFromDate(item.nextReviewAt),
      payload: item,
    });
  }

  Array.from(buckets.values()).forEach((bucket: QueueCandidate<T>[]) => {
    bucket.sort((a: QueueCandidate<T>, b: QueueCandidate<T>) => b.urgency - a.urgency);
  });

  const queue: T[] = [];
  let lastTopic = "";

  while (true) {
    const active = Array.from(buckets.entries()).filter(([, bucket]) => bucket.length > 0);
    if (active.length === 0) break;

    active.sort((a, b) => {
      const aUrgency = a[1][0]?.urgency ?? 0;
      const bUrgency = b[1][0]?.urgency ?? 0;
      return bUrgency - aUrgency;
    });

    let chosen = active.find(([topic]) => topic !== lastTopic);
    if (!chosen) {
      chosen = active[0];
    }

    const [topic, bucket] = chosen;
    const candidate = bucket.shift();

    if (!candidate) continue;

    queue.push(candidate.payload);
    lastTopic = topic;
  }

  return queue;
}
