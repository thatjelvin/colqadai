import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { groq } from "@/lib/groq";
import { createServerClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().min(1),
  currentTopicName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `You are a math tutor assistant embedded in Colqad. The student is currently studying "${parsed.data.currentTopicName}". Answer their questions clearly and concisely, using LaTeX for all mathematical notation. Focus only on helping them understand the current topic. Be encouraging and patient.`,
        },
        {
          role: "user",
          content: parsed.data.message,
        },
      ],
    });

    return NextResponse.json({
      message: response.choices[0]?.message?.content ?? "",
    });
  } catch (error) {
    console.error("Tutor help request failed", error);
    return NextResponse.json({ error: "Failed to process tutor request" }, { status: 500 });
  }
}
