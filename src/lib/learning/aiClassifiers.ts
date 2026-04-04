import { ErrorType } from "@prisma/client";
import { anthropic } from "@/lib/anthropic";

const MODEL = "claude-sonnet-4-5-20251101";

type GradeResult = {
  isCorrect: boolean;
  rationale: string;
};

type ErrorResult = {
  errorType: ErrorType;
  explanation: string;
};

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON payload not found");
  }

  return trimmed.slice(start, end + 1);
}

export async function gradeAnswer(
  problemBody: string,
  correctSolution: string,
  userAnswer: string
): Promise<GradeResult> {
  const prompt = [
    "You are grading a university-level math answer.",
    "Return strict JSON only.",
    "Schema: {\"isCorrect\": boolean, \"rationale\": string}",
    "Different mathematically-valid methods should be accepted.",
    `Problem: ${problemBody}`,
    `Reference solution: ${correctSolution}`,
    `Student answer: ${userAnswer}`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(extractJson(text));

    return {
      isCorrect: Boolean(parsed.isCorrect),
      rationale: String(parsed.rationale || "No rationale provided."),
    };
  } catch {
    return {
      isCorrect: false,
      rationale: "Automatic grading fallback marked this answer as incorrect.",
    };
  }
}

export async function classifyError(
  problemBody: string,
  correctSolution: string,
  userAnswer: string
): Promise<ErrorResult> {
  const prompt = [
    "Categorize the student's math mistake.",
    "Return strict JSON only.",
    "Schema: {\"errorType\":\"CONCEPTUAL_GAP\"|\"ALGEBRAIC_SLIP\"|\"MISREAD_QUESTION\"|\"FORMULA_RECALL_FAILURE\"|\"WRONG_METHOD_CHOSEN\",\"explanation\":string}",
    `Problem: ${problemBody}`,
    `Correct solution: ${correctSolution}`,
    `Student answer: ${userAnswer}`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 180,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(extractJson(text));

    if (!Object.values(ErrorType).includes(parsed.errorType)) {
      throw new Error("Invalid error type");
    }

    return {
      errorType: parsed.errorType,
      explanation: String(parsed.explanation || "The selected method did not match the question structure."),
    };
  } catch {
    return {
      errorType: ErrorType.WRONG_METHOD_CHOSEN,
      explanation: "The chosen approach does not align with the demands of this question.",
    };
  }
}

export async function generateElaborationPrompt(
  problemBody: string,
  userAnswer: string,
  correctSolution: string
): Promise<string> {
  const prompt = [
    "role: elaboration_prompter",
    "Generate exactly one concise follow-up question to deepen understanding.",
    "Focus on why the method works or what changes under a modified assumption.",
    "Return plain text only.",
    `Problem: ${problemBody}`,
    `User answer: ${userAnswer}`,
    `Correct solution: ${correctSolution}`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 80,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    return text || "Why does this method work in this problem setting?";
  } catch {
    return "What would change if one key assumption in this problem changed?";
  }
}
