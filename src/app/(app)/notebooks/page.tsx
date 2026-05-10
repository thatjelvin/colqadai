"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, FileText, Calendar, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotebookListItem = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  documentsCount: number;
  conceptsCount: number;
};

export default function NotebooksPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notebookTitle, setNotebookTitle] = useState("");
  const [notebookDescription, setNotebookDescription] = useState("");
  const [notebooks, setNotebooks] = useState<NotebookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadNotebooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notebooks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch notebooks");
      const data = (await response.json()) as NotebookListItem[];
      setNotebooks(data);
    } catch (error) {
      console.error("Error loading notebooks:", error);
      setNotebooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotebooks();
  }, [loadNotebooks]);

  const handleCreateNotebook = async () => {
    if (!notebookTitle.trim() || isSaving) return;

    setIsSaving(true);
    setFormError(null);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notebookTitle,
          description: notebookDescription || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create notebook");
      }

      setNotebookTitle("");
      setNotebookDescription("");
      setIsCreateOpen(false);
      await loadNotebooks();
      setStatusMessage("Notebook created.");
    } catch (error) {
      console.error("Error creating notebook:", error);
      setFormError("Could not create notebook. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    setFormError(null);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete notebook");
      }
      await loadNotebooks();
      setStatusMessage("Notebook deleted.");
    } catch (error) {
      console.error("Error deleting notebook:", error);
      setFormError("Could not delete notebook. Please try again.");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Notebooks</h1>
          <p className="text-muted-foreground mt-1">
            Organize source material, generate summaries, and extract concepts for spaced mixed
            review.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Notebook
        </Button>
      </div>
      {formError ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="mb-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {statusMessage}
        </p>
      ) : null}

      {isCreateOpen && (
        <Card className="mb-8 border-primary border-2">
          <CardHeader>
            <CardTitle>Create Notebook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor="notebook-title">Title</Label>
                <Input
                  id="notebook-title"
                  placeholder="e.g. Calculus II"
                  value={notebookTitle}
                  onChange={(event) => setNotebookTitle(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notebook-description">Description (optional)</Label>
                <Input
                  id="notebook-description"
                  placeholder="What is this notebook focused on?"
                  value={notebookDescription}
                  onChange={(event) => setNotebookDescription(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateNotebook} disabled={!notebookTitle.trim() || isSaving}>
                  {isSaving ? "Creating..." : "Create"}
                </Button>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading notebooks...</CardContent>
        </Card>
      ) : notebooks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No notebooks yet. Create one to start source organization, summaries, and concept extraction.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <Card
              key={notebook.id}
              className="flex flex-col h-full hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-3 flex-1">
                <div className="flex items-start justify-between">
                  <Badge variant="outline">Notebook</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteNotebook(notebook.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle className="text-lg mb-1">{notebook.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {notebook.description || "No description yet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground flex items-center mb-1">
                      <FileText className="h-3 w-3 mr-1" /> Documents
                    </span>
                    <span className="font-medium text-sm">{notebook.documentsCount}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground flex items-center mb-1">
                      <BookOpen className="h-3 w-3 mr-1" /> Concepts
                    </span>
                    <span className="font-medium text-sm">{notebook.conceptsCount}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(notebook.createdAt).toLocaleDateString()}
                  </span>
                  <span>Updated {new Date(notebook.updatedAt).toLocaleDateString()}</span>
                </div>

                <Button variant="secondary" className="w-full mt-4" asChild>
                  <Link href={`/notebooks/${notebook.id}`}>Open Notebook</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
