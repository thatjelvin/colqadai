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
      short_intro: string;
      definitions: Array<{
        number_label: string;
        title: string;
        statement: string;
        formula_latex?: string;
      }>;
      transition_prose: string;
      theorems: Array<{
        number_label: string;
        title: string;
        statement: string;
        formula_latex?: string;
      }>;
      remarks: string[];
      worked_examples: Array<{ title: string; content: string }>;
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
    } catch (error) {
      console.error("Failed to update chapter progress", error);
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
            <CardTitle>
              Chapter {chapter.chapter_number}: {chapter.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <MathRenderer content={chapter.content.short_intro} className="text-sm sm:text-base" />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Definitions</h3>
              {chapter.content.definitions.map((definition, index) => (
                <article key={`${definition.number_label}-${index}`} className="rounded-md border bg-background p-4">
                  <p className="mb-2 text-sm">
                    <strong>Definition {definition.number_label}.</strong>{" "}
                    <strong>{definition.title}.</strong>
                  </p>
                  <MathRenderer content={definition.statement} className="text-sm" />
                  {definition.formula_latex ? <MathRenderer content={`$$${definition.formula_latex}$$`} className="text-sm" /> : null}
                </article>
              ))}
            </section>

            <section>
              <MathRenderer content={chapter.content.transition_prose} className="text-sm sm:text-base" />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Theorems</h3>
              {chapter.content.theorems.map((theorem, index) => (
                <article key={`${theorem.number_label}-${index}`} className="rounded-md border p-4">
                  <p className="mb-2 text-sm">
                    <strong>
                      <em>Theorem {theorem.number_label}.</em>
                    </strong>{" "}
                    <strong>{theorem.title}.</strong>
                  </p>
                  <MathRenderer content={theorem.statement} className="text-sm" />
                  {theorem.formula_latex ? <MathRenderer content={`$$${theorem.formula_latex}$$`} className="text-sm" /> : null}
                </article>
              ))}
            </section>

            {chapter.content.remarks.length > 0 ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Remarks</h3>
                {chapter.content.remarks.map((remark, index) => (
                  <div key={index} className="rounded-md border-l-2 border-muted-foreground/30 pl-3 text-sm text-muted-foreground">
                    <p>
                      <em>Remark.</em>
                    </p>
                    <MathRenderer content={remark} className="text-sm" />
                  </div>
                ))}
              </section>
            ) : null}

            {chapter.content.worked_examples.length > 0 ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Worked Examples</h3>
                {chapter.content.worked_examples.map((example) => (
                  <div key={example.title} className="rounded-md border border-blue-200 bg-blue-50/40 p-4">
                    <p className="mb-2 text-sm font-medium">{example.title}</p>
                    <MathRenderer content={example.content} className="text-sm" />
                  </div>
                ))}
              </section>
            ) : null}
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
