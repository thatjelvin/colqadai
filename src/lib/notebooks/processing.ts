import crypto from "crypto";

const MAX_CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

export type IngestionSourceType = "TEXT" | "PDF";

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function normalizeSourceText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractPdfText(pdfBytes: Uint8Array): string {
  const raw = Buffer.from(pdfBytes).toString("latin1");
  const streams = Array.from(raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g));
  const tokens: string[] = [];

  for (const stream of streams) {
    const chunk = stream[1] ?? "";
    const matches = chunk.match(/\((?:\\.|[^\\()])*\)/g);
    if (!matches) {
      continue;
    }

    for (const token of matches) {
      const unwrapped = token.slice(1, -1);
      const decoded = unwrapped
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "")
        .replace(/\\t/g, " ")
        .replace(/\\\\/g, "\\");
      if (decoded.trim()) {
        tokens.push(decoded);
      }
    }
  }

  if (tokens.length === 0) {
    return "";
  }

  return normalizeSourceText(tokens.join("\n"));
}

export function chunkText(text: string): string[] {
  const normalized = normalizeSourceText(text);
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + MAX_CHUNK_SIZE, normalized.length);
    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end === normalized.length) {
      break;
    }

    start = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

export type ChunkWithId = {
  id: string;
  content: string;
};

export type GeneratedSummary = {
  summary: string;
  keyPoints: string[];
  sourceChunkIds: string[];
};

export type GeneratedConcept = {
  name: string;
  explanation: string;
  evidenceChunkIds: string[];
  confidence: number;
};

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30);
}

function sentenceScore(sentence: string): number {
  const words = sentence.split(/\s+/).filter(Boolean);
  const mathSignals = (sentence.match(/=|\\int|\\sum|\\frac|theorem|proof|derivative|integral|matrix|vector/gi) ?? []).length;
  return words.length + mathSignals * 8;
}

export function generateGroundedSummary(chunks: ChunkWithId[]): GeneratedSummary {
  const scored = chunks
    .flatMap((chunk) =>
      splitSentences(chunk.content).map((sentence) => ({
        chunkId: chunk.id,
        sentence,
        score: sentenceScore(sentence),
      }))
    )
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, 6);
  const summary = selected.map((entry) => entry.sentence).join(" ");
  const keyPoints = selected.slice(0, 4).map((entry) => entry.sentence);
  const sourceChunkIds = Array.from(new Set(selected.map((entry) => entry.chunkId)));

  return {
    summary: summary || "No summary available. Add more source material.",
    keyPoints,
    sourceChunkIds,
  };
}

export function generateConcepts(chunks: ChunkWithId[]): GeneratedConcept[] {
  const concepts = new Map<string, { evidence: Set<string>; snippets: string[] }>();

  for (const chunk of chunks) {
    const sentences = splitSentences(chunk.content);
    for (const sentence of sentences) {
      const candidates = sentence.match(/\b([A-Z][a-z]+(?:\s+[a-z]+){0,3})\b/g) ?? [];
      const mathCandidates = sentence.match(/\b(derivative|integral|matrix|vector|eigenvalue|series|convergence|probability|limit|function)\b/gi) ?? [];
      const merged = [...candidates, ...mathCandidates].map((value) => value.trim());

      for (const conceptName of merged) {
        const normalized = conceptName
          .replace(/\s+/g, " ")
          .replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "")
          .toLowerCase();

        if (!normalized || normalized.length < 4) {
          continue;
        }

        const title = normalized
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        if (!concepts.has(title)) {
          concepts.set(title, { evidence: new Set<string>(), snippets: [] });
        }

        const entry = concepts.get(title);
        if (!entry) continue;

        entry.evidence.add(chunk.id);
        if (entry.snippets.length < 2) {
          entry.snippets.push(sentence);
        }
      }
    }
  }

  return Array.from(concepts.entries())
    .map(([name, entry]) => ({
      name,
      explanation:
        entry.snippets[0] ??
        "This concept appears in your source material and should be reviewed in practice sessions.",
      evidenceChunkIds: Array.from(entry.evidence),
      confidence: Math.min(1, 0.45 + entry.evidence.size * 0.15),
    }))
    .sort((a, b) => b.evidenceChunkIds.length - a.evidenceChunkIds.length)
    .slice(0, 12);
}

export async function readPdfTextFromBase64(base64: string): Promise<string> {
  const bytes = Buffer.from(base64, "base64");
  return extractPdfText(bytes);
}
