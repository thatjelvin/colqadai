import { groq } from "@/lib/groq";

const MODEL = "llama-3.3-70b-versatile";

/**
 * Generate a math problem on a given topic and difficulty level using the LLM.
 * @param topicSlug The topic slug (e.g., "differential-calculus")
 * @param difficulty A number from 1 to 5 representing difficulty
 * @returns An object with problem and solution strings
 */
export async function generateProblem(
  topicSlug: string,
  difficulty: number
): Promise<{ problem: string; solution: string }> {
  // Map the topic slug to a more readable topic name for the prompt
  const topicName = topicSlug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const prompt = [
    `You are a university mathematics professor. Generate an original math problem on the topic of "${topicName}" with a difficulty level of ${difficulty}/5.`,
    "The problem should be clear, concise, and solvable with appropriate mathematical knowledge.",
    "Provide both the problem statement and a step-by-step solution.",
    "Format your response as a JSON object with exactly two keys: \"problem\" and \"solution\".",
    "Example format:",
    '{',
    '  "problem": "Find the derivative of f(x) = x^2 + 3x + 2.",',
    `  "solution": "Using the power rule, the derivative is f'(x) = 2x + 3."`,
    `}`,
    "Do not include any additional text or explanation outside the JSON.",
  ].join("\n");

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7, // Some creativity but not too random
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    if (typeof parsed.problem !== "string" ||
        typeof parsed.solution !== "string") {
      throw new Error("Invalid response format from LLM");
    }

    return {
      problem: parsed.problem.trim(),
      solution: parsed.solution.trim(),
    };
  } catch (error) {
    console.error("Error generating problem with LLM:", error);
    // Fallback to a simple problem if LLM fails
    return {
      problem: `What is the derivative of f(x) = x^2?`,
      solution: `The derivative is f'(x) = 2x.`,
    };
  }
}