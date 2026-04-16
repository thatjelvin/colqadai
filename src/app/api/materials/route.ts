export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { gemini } from "@/lib/gemini";
import { readPdfTextFromBase64, normalizeSourceText } from "@/lib/notebooks/processing";
import { z } from "zod";

export type Material = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  summary: string | null;
  storage_url: string | null;
  created_at: string;
};

const SUMMARY_SYSTEM_PROMPT = `You are a learning assistant for university STEM students.
Generate a structured concept summary from the provided material.
Format your response as:

**Overview**
2–3 sentences describing what this material covers.

**Key Concepts**
• Concept 1: brief explanation
• Concept 2: brief explanation
(up to 6 concepts)

**Main Takeaways**
• Takeaway 1
• Takeaway 2
• Takeaway 3

Be concise, mathematically precise, and student-friendly.`;

async function generateSummary(
  type: string,
  content: string,
  youtubeUrl?: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const userPrompt = "Summarize the following material for a university student:";

  try {
    if (type === "youtube" && youtubeUrl) {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: "video/*",
                  fileUri: youtubeUrl,
                },
              },
              { text: userPrompt },
            ],
          },
        ],
        config: { systemInstruction: SUMMARY_SYSTEM_PROMPT, maxOutputTokens: 1024 },
      });
      return response.text?.trim() ?? "Could not generate summary.";
    }

    if (type === "image" && imageBase64 && imageMimeType) {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
              { text: userPrompt },
            ],
          },
        ],
        config: { systemInstruction: SUMMARY_SYSTEM_PROMPT, maxOutputTokens: 1024 },
      });
      return response.text?.trim() ?? "Could not generate summary.";
    }

    // Text-based (pdf, note, ppt)
    if (!content) return "No content provided to summarize.";
    const truncated = content.slice(0, 12000);
    const response = await gemini.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: `${userPrompt}\n\n${truncated}` }] }],
      config: { systemInstruction: SUMMARY_SYSTEM_PROMPT, maxOutputTokens: 1024 },
    });
    return response.text?.trim() ?? "Could not generate summary.";
  } catch (error) {
    console.error("Gemini summarization error:", error);
    return "Summary generation failed. Please try again.";
  }
}

export async function GET() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Materials fetch error:", error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? []);
}

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("note"),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal("pdf"),
    title: z.string().min(1).max(200),
    pdfBase64: z.string().min(1),
  }),
  z.object({
    type: z.literal("image"),
    title: z.string().min(1).max(200),
    imageBase64: z.string().min(1),
    imageMimeType: z.string().min(1),
  }),
  z.object({
    type: z.literal("youtube"),
    title: z.string().min(1).max(200),
    url: z.string().url(),
  }),
  z.object({
    type: z.literal("ppt"),
    title: z.string().min(1).max(200),
    content: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;

  let textContent = "";
  let youtubeUrl: string | undefined;
  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;
  let storageUrl: string | null = null;

  if (data.type === "note" || data.type === "ppt") {
    textContent = normalizeSourceText(data.content);
  } else if (data.type === "pdf") {
    try {
      textContent = await readPdfTextFromBase64(data.pdfBase64);
      if (!textContent) {
        return NextResponse.json({ error: "Could not extract text from PDF." }, { status: 422 });
      }

      // Upload PDF to Supabase Storage
      try {
        const bytes = Buffer.from(data.pdfBase64, "base64");
        const filePath = `${user.id}/${Date.now()}/upload.pdf`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("materials")
          .upload(filePath, bytes, { contentType: "application/pdf", upsert: false });
        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage.from("materials").getPublicUrl(filePath);
          storageUrl = publicUrlData?.publicUrl ?? null;
        }
      } catch (storageErr) {
        console.warn("Storage upload skipped:", storageErr);
      }
    } catch {
      return NextResponse.json({ error: "Failed to process PDF." }, { status: 422 });
    }
  } else if (data.type === "youtube") {
    youtubeUrl = data.url;
    textContent = `YouTube video: ${data.url}`;
    storageUrl = data.url;
  } else if (data.type === "image") {
    imageBase64 = data.imageBase64;
    imageMimeType = data.imageMimeType;

    // Upload image to Supabase Storage
    try {
      const ext = imageMimeType.includes("png") ? "png" : "jpg";
      const bytes = Buffer.from(imageBase64, "base64");
      const filePath = `${user.id}/${Date.now()}/upload.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("materials")
        .upload(filePath, bytes, { contentType: imageMimeType, upsert: false });
      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage.from("materials").getPublicUrl(filePath);
        storageUrl = publicUrlData?.publicUrl ?? null;
      }
    } catch (storageErr) {
      console.warn("Storage upload skipped:", storageErr);
    }
  }

  const summary = await generateSummary(data.type, textContent, youtubeUrl, imageBase64, imageMimeType);

  const { data: material, error: insertError } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      type: data.type,
      title: data.title,
      summary,
      storage_url: storageUrl,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Materials insert error:", insertError);
    return NextResponse.json({ error: "Failed to save material." }, { status: 500 });
  }

  return NextResponse.json(material, { status: 201 });
}
