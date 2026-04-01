"use client";

import { useState } from "react";
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
import Link from "next/link";
// Assuming you have Dialog components. Assuming you don't, I will just use basic UI for now to keep it clean.

const mockNotebooks = [
  {
    id: "1",
    title: "Calculus II",
    description: "Integration techniques, series, and applications",
    subject: "Mathematics",
    documentsCount: 3,
    conceptsCount: 15,
    lastAccessed: "2 hours ago",
    created: "Mar 20, 2026",
  },
  {
    id: "2",
    title: "Linear Algebra",
    description: "Vectors, matrices, eigenvalues, and transformations",
    subject: "Mathematics",
    documentsCount: 5,
    conceptsCount: 22,
    lastAccessed: "1 day ago",
    created: "Mar 15, 2026",
  },
  {
    id: "3",
    title: "Differential Equations",
    description: "First and second order ODEs, systems, and applications",
    subject: "Mathematics",
    documentsCount: 2,
    conceptsCount: 12,
    lastAccessed: "3 days ago",
    created: "Mar 10, 2026",
  },
];

export default function NotebooksPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [notebookTitle, setNotebookTitle] = useState("");
  const [notebookDescription, setNotebookDescription] = useState("");

  const handleCreatePrompt = () => {
    setIsCreateOpen(true);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Notebooks</h1>
          <p className="text-muted-foreground mt-1">
            Organize your learning materials, conceptual notes, and practice
            sessions.
          </p>
        </div>
        <Button onClick={handleCreatePrompt}>
          <Plus className="mr-2 h-4 w-4" />
          New Notebook
        </Button>
      </div>

      {isCreateOpen && (
        <Card className="mb-8 border-primary border-2">
          <CardHeader>
            <CardTitle>Create a Novel Note</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Logic 101"
                  value={notebookTitle}
                  onChange={(e) => setNotebookTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsCreateOpen(false)}
                  disabled={!notebookTitle}
                >
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockNotebooks.map((notebook) => (
          <Card key={notebook.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3 flex-1">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="mb-2">
                  {notebook.subject}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardTitle className="text-lg mb-1">{notebook.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {notebook.description}
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
                  {notebook.created}
                </span>
                <span>Edited {notebook.lastAccessed}</span>
              </div>
              
              <Button variant="secondary" className="w-full mt-4" asChild>
                <Link href={`/notebooks/${notebook.id}`}>Open Notebook</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}