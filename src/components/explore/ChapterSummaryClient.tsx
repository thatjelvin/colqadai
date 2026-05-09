"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MathRenderer } from "@/components/MathRenderer";
import { AppHamburgerDrawer } from "@/components/navigation/AppHamburgerDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FloatingTutorHelp } from "@/components/FloatingTutorHelp";

type ChapterSummaryClientProps = {
  topicSlug: string;
  topicName: string;
  parentTopicName: string;
  prerequisites: string[];
  summaryOverview: string;
  chapters: Array<{
    chapter_number: number;
    title: string;
    content: {
      conceptual_explanation: string;
      key_formulas: Array<{ label: string; latex: string }>;
      derivations: Array<{ title: string; content: string }>;
      worked_examples: Array<{ title: string; content: string }>;
      common_mistakes: string[];
    };
  }>;
};

export function ChapterSummaryClient({
  topicSlug,
  topicName,
  parentTopicName,
  prerequisites,
  summaryOverview,
  chapters,
}: ChapterSummaryClientProps) {
  const [chapterIndex, setChapterIndex] = useState(0);
  const chapter = chapters[chapterIndex];
  const totalChapters = chapters.length;
  const progressPercent = Math.round(((chapterIndex + 1) / totalChapters) * 100);

  async function updateChapterProgress(nextChapterIndex: number) {
    try {
      await fetch("/api/topics/chapter-progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicSlug,
          chaptersCompleted: nextChapterIndex + 1,
        }),
      });
    } catch {
      // best-effort persistence
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      <AppHamburgerDrawer />
      <div className="mb-6 space-y-3">
        <Link href="/topics">
          <Button variant="ghost" size="sm" className="gap-1 px-0">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">{parentTopicName}</div>
        <h1 className="text-3xl font-bold tracking-tight">{topicName}</h1>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Chapter {chapterIndex + 1} of {totalChapters}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <MathRenderer content={summaryOverview} className="text-sm text-foreground sm:text-base" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prerequisites</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {prerequisites.map((item) => (
              <Badge key={item} variant="secondary" className="py-1">
                <MathRenderer content={item} className="text-xs leading-5" />
              </Badge>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Chapter {chapter.chapter_number}: {chapter.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-semibold">Conceptual Explanation</p>
              <MathRenderer content={chapter.content.conceptual_explanation} className="text-sm sm:text-base" />
            </div>

            {chapter.content.key_formulas.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Key Formulas</p>
                {chapter.content.key_formulas.map((formula) => (
                  <div key={formula.label} className="rounded-md border bg-background p-4">
                    <MathRenderer content={formula.label} className="mb-2 text-sm font-medium" />
                    <MathRenderer content={`$$${formula.latex}$$`} className="text-sm" />
                  </div>
                ))}
              </div>
            ) : null}

            {chapter.content.derivations.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Derivations</p>
                {chapter.content.derivations.map((derivation) => (
                  <div key={derivation.title} className="rounded-md border p-4">
                    <p className="mb-2 text-sm font-medium">{derivation.title}</p>
                    <MathRenderer content={derivation.content} className="text-sm" />
                  </div>
                ))}
              </div>
            ) : null}

            {chapter.content.worked_examples.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Worked Examples</p>
                {chapter.content.worked_examples.map((example) => (
                  <div key={example.title} className="rounded-md border border-blue-200 bg-blue-50/40 p-4">
                    <p className="mb-2 text-sm font-medium">{example.title}</p>
                    <MathRenderer content={example.content} className="text-sm" />
                  </div>
                ))}
              </div>
            ) : null}

            {chapter.content.common_mistakes.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-semibold">Common Mistakes</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {chapter.content.common_mistakes.map((mistake) => (
                    <li key={mistake}>
                      <MathRenderer content={mistake} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          {chapterIndex > 0 ? (
            <Button variant="outline" onClick={() => setChapterIndex((prev) => prev - 1)}>
              ← Previous Chapter
            </Button>
          ) : (
            <span />
          )}

          {chapterIndex < totalChapters - 1 ? (
            <Button
              onClick={async () => {
                const nextChapterIndex = chapterIndex + 1;
                await updateChapterProgress(nextChapterIndex);
                setChapterIndex(nextChapterIndex);
              }}
            >
              Next Chapter →
            </Button>
          ) : (
            <Link href={`/review/${topicSlug}`}>
              <Button>Start Review</Button>
            </Link>
          )}
        </div>
      </div>
      <FloatingTutorHelp currentTopicName={topicName} />
    </div>
  );
}
