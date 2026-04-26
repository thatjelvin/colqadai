"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type NotebookDocument = {
  id: string;
  title: string;
  sourceType: "TEXT" | "PDF";
  chunkCount: number;
  charCount: number;
  createdAt: string;
};

type NotebookSummary = {
  id: string;
  summary: string;
  keyPoints: string[] | null;
  sourceChunkIds: string[] | null;
  createdAt: string;
};

type NotebookConcept = {
  id: string;
  name: string;
  explanation: string;
  evidenceChunkIds: string[] | null;
  confidence: number | null;
};

type NotebookResponse = {
  id: string;
  title: string;
  description: string | null;
  documents: NotebookDocument[];
  summaries: NotebookSummary[];
  concepts: NotebookConcept[];
};

export default function NotebookDetailPage() {
  const params = useParams();
  const notebookId = params.id as string;

  const [notebook, setNotebook] = useState<NotebookResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestSummary = useMemo(() => notebook?.summaries?.[0] ?? null, [notebook]);

  const loadNotebook = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notebooks/${notebookId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load notebook");
      const data = (await response.json()) as NotebookResponse;
      setNotebook(data);
    } catch (error) {
      console.error("Error loading notebook:", error);
      setNotebook(null);
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    void loadNotebook();
  }, [loadNotebook]);

  const generateSummaryAndConcepts = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/notebooks/${notebookId}/summary`, { method: "POST" });
      if (!response.ok) throw new Error("Failed to generate summary");
      await loadNotebook();
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 lg:p-8 max-w-6xl mx-auto">Loading notebook...</div>;
  }

  if (!notebook) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <p className="text-muted-foreground">Notebook not found.</p>
        <Button className="mt-4" asChild>
          <Link href="/notebooks">Back to notebooks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{notebook.title}</h1>
          <p className="text-muted-foreground mt-2">
            {notebook.description || "Generate summaries and concepts from existing notebook sources."}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/notebooks">All Notebooks</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ingested documents</CardTitle>
            <CardDescription>Source chunks power grounded summaries and concepts.</CardDescription>
          </div>
          <Button
            onClick={generateSummaryAndConcepts}
            disabled={isSubmitting || notebook.documents.length === 0}
          >
            Generate Summary + Concepts
          </Button>
        </CardHeader>
        <CardContent>
          {notebook.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notebook source documents available.</p>
          ) : (
            <div className="space-y-2">
              {notebook.documents.map((document) => (
                <div key={document.id} className="border rounded-md p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{document.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {document.chunkCount} chunks • {document.charCount} chars •{" "}
                      {new Date(document.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline">{document.sourceType}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Grounded in notebook source chunks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestSummary ? (
              <>
                <p className="text-sm">{latestSummary.summary}</p>
                {latestSummary.keyPoints && latestSummary.keyPoints.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {latestSummary.keyPoints.map((point, index) => (
                      <li key={`${latestSummary.id}-point-${index}`}>{point}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Source chunks: {latestSummary.sourceChunkIds?.length ?? 0}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No summary generated yet. Generate one when notebook documents are available.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Concepts</CardTitle>
            <CardDescription>Extracted concepts with source evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {notebook.concepts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No concepts extracted yet.</p>
            ) : (
              <div className="space-y-3">
                {notebook.concepts.map((concept) => (
                  <div key={concept.id} className="border rounded-md p-3">
                    <p className="font-medium text-sm">{concept.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{concept.explanation}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Evidence chunks: {concept.evidenceChunkIds?.length ?? 0} • Confidence:{" "}
                      {concept.confidence ? `${Math.round(concept.confidence * 100)}%` : "n/a"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
