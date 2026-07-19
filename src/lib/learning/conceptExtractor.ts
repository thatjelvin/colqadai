import { ai } from "@/lib/ai";

interface ChatMessageForExtraction {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedConcept {
  name: string;
  summary: string;
  topicSlug: string | null;
}

const EXTRACTION_SYSTEM_PROMPT = `You are a mathematics concept extractor. Given a tutoring conversation between a student and an AI tutor, identify the key mathematical concepts discussed.

For each concept, provide:
1. "name": A concise name (e.g., "Chain Rule", "Eigenvalue Decomposition")
2. "summary": A one-sentence summary of what the student learned about this concept
3. "topicSlug": The topic slug this belongs to (e.g., "differential-calculus", "linear-algebra"), or null if unsure

Rules:
- Only extract concepts that were EXPLICITLY taught or discussed in depth
- Skip concepts that were merely mentioned in passing
- Extract at most 5 concepts per conversation
- Keep concept names short (2-5 words)
- Return a JSON array of objects: [{ "name": "...", "summary": "...", "topicSlug": "..." | null }]
- If no concepts were meaningfully taught, return an empty array []`;

/**
 * Extract key mathematical concepts from a chat conversation.
 * Uses the AI model to identify concepts that were taught or discussed.
 *
 * @param messages The chat messages (system, user, assistant) to analyze
 * @param problemContext Optional problem context that was discussed
 * @returns Array of extracted concepts with name, summary, and topic slug
 */
export async function extractConceptsFromChat(
  messages: ChatMessageForExtraction[],
  problemContext?: string
): Promise<ExtractedConcept[]> {
  if (messages.length < 2) return [];

  // Only extract if the conversation has meaningful content
  const totalContentLength = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (totalContentLength < 100) return [];

  const conversationText = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const prompt = problemContext
    ? `The following conversation is about this problem:\n${problemContext}\n\nConversation:\n${conversationText}`
    : conversationText;

  try {
    const response = await ai.chat.completions.create({
      model: "deepseek-v4-flash-free",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    // Handle both array and { concepts: [...] } response formats
    const concepts: ExtractedConcept[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.concepts)
        ? parsed.concepts
        : [];

    return concepts
      .filter((c) => c.name && c.name.trim().length > 0)
      .slice(0, 5);
  } catch (error) {
    console.error("Error extracting concepts from chat:", error);
    return [];
  }
}
