"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
import { ArrowLeft } from "lucide-react";
import { SectionNav } from "./SectionNav";
import { PrerequisitesBlock } from "./PrerequisitesBlock";
import { DefinitionCard } from "./DefinitionCard";
import { TheoremCard } from "./TheoremCard";
import { DerivationBlock } from "./DerivationBlock";
import { ExampleBlock } from "./ExampleBlock";
import { CommonMistakeCallout } from "./CommonMistakeCallout";
import { FormulaSummaryCard } from "./FormulaSummaryCard";
import { StartPracticeButton } from "./StartPracticeButton";
import {
  SECTION_LABELS,
  getPresentSections,
  type ChapterSummary,
  type SummarySectionId,
} from "@/lib/learning/summary-schema";

interface ChapterSummaryClientProps {
  parentTopicDisplayName: string;
  subtopicDisplayName: string;
  subtopicSlug: string;
  summary: ChapterSummary;
  startReviewAction: (formData: FormData) => Promise<void>;
  keyConceptsForAction: { name: string; explanation: string; example: string }[];
}

function SectionHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-2">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      {eyebrow && (
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </span>
      )}
    </div>
  );
}

function Section({ id, children }: { id: SummarySectionId; children: React.ReactNode }) {
  return (
    <section id={`section-${id}`} className="scroll-mt-24 space-y-4">
      {children}
    </section>
  );
}

export function ChapterSummaryClient({
  parentTopicDisplayName,
  subtopicDisplayName,
  subtopicSlug,
  summary,
  startReviewAction,
  keyConceptsForAction,
}: ChapterSummaryClientProps) {
  const sections = getPresentSections(summary);
  const overviewId: SummarySectionId = "overview";

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 space-y-2">
        <Link
          href="/explore"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Explore / {parentTopicDisplayName}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {subtopicDisplayName}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-10">
          {sections.includes(overviewId) && (
            <Section id={overviewId}>
              <SectionHeader
                title={SECTION_LABELS.overview}
                eyebrow="Read first"
              />
              <Card>
                <CardContent className="px-6 py-5">
                  <p className="text-base leading-7 text-foreground sm:text-lg sm:leading-8">
                    {summary.overview}
                  </p>
                </CardContent>
              </Card>
            </Section>
          )}

          {sections.includes("prerequisites") && (
            <Section id="prerequisites">
              <SectionHeader title={SECTION_LABELS.prerequisites} />
              <PrerequisitesBlock prerequisites={summary.prerequisites} />
            </Section>
          )}

          {sections.includes("definitions") && (
            <Section id="definitions">
              <SectionHeader
                title={SECTION_LABELS.definitions}
                eyebrow={`${summary.definitions.length} terms`}
              />
              <div className="space-y-3">
                {summary.definitions.map((definition) => (
                  <DefinitionCard key={definition.name} definition={definition} />
                ))}
              </div>
            </Section>
          )}

          {sections.includes("theorems") && (
            <Section id="theorems">
              <SectionHeader
                title={SECTION_LABELS.theorems}
                eyebrow={`${summary.theorems.length} result${summary.theorems.length === 1 ? "" : "s"}`}
              />
              <div className="space-y-3">
                {summary.theorems.map((theorem) => (
                  <TheoremCard key={theorem.name} theorem={theorem} />
                ))}
              </div>
            </Section>
          )}

          {sections.includes("derivations") && (
            <Section id="derivations">
              <SectionHeader title={SECTION_LABELS.derivations} />
              <div className="space-y-3">
                {summary.derivations.map((derivation, index) => (
                  <DerivationBlock key={`${derivation.result}-${index}`} derivation={derivation} />
                ))}
              </div>
            </Section>
          )}

          {sections.includes("examples") && (
            <Section id="examples">
              <SectionHeader
                title={SECTION_LABELS.examples}
                eyebrow={`${summary.examples.length} worked`}
              />
              <div className="space-y-3">
                {summary.examples.map((example, index) => (
                  <ExampleBlock key={index} example={example} index={index} />
                ))}
              </div>
            </Section>
          )}

          {sections.includes("common_mistakes") && (
            <Section id="common_mistakes">
              <SectionHeader
                title={SECTION_LABELS.common_mistakes}
                eyebrow="Watch out"
              />
              <div className="space-y-3">
                {summary.common_mistakes.map((mistake, index) => (
                  <CommonMistakeCallout
                    key={`${mistake.error}-${index}`}
                    mistake={mistake}
                  />
                ))}
              </div>
            </Section>
          )}

          {sections.includes("formula_summary") && (
            <Section id="formula_summary">
              <SectionHeader
                title={SECTION_LABELS.formula_summary}
                eyebrow="Quick reference"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {summary.formula_summary.map((formula) => (
                  <FormulaSummaryCard
                    key={`${formula.name}-${formula.formula}`}
                    formula={formula}
                  />
                ))}
              </div>
            </Section>
          )}

          <section className="space-y-4 rounded-xl border border-border bg-card px-6 py-8 sm:px-8 sm:py-10">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Ready to practice?
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                Start a review session built from the {summary.definitions.length} concept
                {summary.definitions.length === 1 ? "" : "s"} above. You&apos;ll be quizzed in
                10&ndash;15 minutes and we&apos;ll update your mastery for this topic.
              </p>
            </div>
            <form action={startReviewAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input type="hidden" name="slug" value={subtopicSlug} />
              <input
                type="hidden"
                name="keyConcepts"
                value={JSON.stringify(keyConceptsForAction)}
              />
              <StartPracticeButton />
              <Link
                href="/explore"
                className="text-sm text-muted-foreground hover:text-foreground sm:ml-2"
              >
                Or browse other topics
              </Link>
            </form>
            <p className="text-xs text-muted-foreground">
              We use the LaTeX rendering you see on this page; if any formula looks off, that&apos;s
              what the AI returned and we&apos;ll re-render on the next refresh.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Math rendering note</summary>
              <div className="mt-2">
                <MathRenderer content="Inline math like $E = mc^2$ and display math like $$\\int_a^b f(x)\\,dx$$ both render through KaTeX." />
              </div>
            </details>
          </section>
        </div>

        <SectionNav sections={sections} />
      </div>
    </div>
  );
}
