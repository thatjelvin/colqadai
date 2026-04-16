"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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
import {
  Brain,
  Flame,
  Target,
  BookOpen,
  Bot,
  Grid3x3,
  BarChart3,
  Upload,
  FileText,
  Youtube,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";

type OverviewStats = {
  totalSeen: number;
  masteredCount: number;
  masteryPercentage: number;
  dueCount: number;
  streak: number;
};

type Material = {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  storage_url: string | null;
  created_at: string;
};

type UploadType = "note" | "pdf" | "image" | "youtube";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  note: FileText,
  pdf: FileText,
  ppt: FileText,
  image: ImageIcon,
  youtube: Youtube,
};

export default function DashboardPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<UploadType>("note");
  const [title, setTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) setStats(await res.json());
    } catch {
      setStats({ totalSeen: 0, masteredCount: 0, masteryPercentage: 0, dueCount: 0, streak: 0 });
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/materials");
      if (res.ok) setMaterials(await res.json());
    } catch {
      setMaterials([]);
    }
  }, []);

  const fetchUserName = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const name =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        null;
      if (name) setUserName(name as string);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMaterials();
    fetchUserName();
  }, [fetchStats, fetchMaterials, fetchUserName]);

  const resetForm = () => {
    setTitle("");
    setNoteContent("");
    setYoutubeUrl("");
    setSelectedFile(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setUploadError("Please enter a title.");
      return;
    }
    setIsUploading(true);
    setUploadError(null);

    try {
      let body: Record<string, unknown>;

      if (uploadType === "note") {
        if (!noteContent.trim()) throw new Error("Please enter some content.");
        body = { type: "note", title: title.trim(), content: noteContent.trim() };
      } else if (uploadType === "youtube") {
        if (!youtubeUrl.trim()) throw new Error("Please enter a YouTube URL.");
        body = { type: "youtube", title: title.trim(), url: youtubeUrl.trim() };
      } else if (uploadType === "pdf" || uploadType === "image") {
        if (!selectedFile) throw new Error("Please select a file.");
        const base64 = await fileToBase64(selectedFile);
        if (uploadType === "pdf") {
          body = { type: "pdf", title: title.trim(), pdfBase64: base64 };
        } else {
          body = {
            type: "image",
            title: title.trim(),
            imageBase64: base64,
            imageMimeType: selectedFile.type || "image/jpeg",
          };
        }
      } else {
        throw new Error("Unknown upload type.");
      }

      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Upload failed. Please try again.");
      }

      const material = await res.json();
      setMaterials((prev) => [material, ...prev]);
      setExpandedId(material.id);
      resetForm();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">
          {userName ? `Welcome back, ${userName.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-muted-foreground">Your learning hub — upload material, review progress, or jump into practice.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Streak</CardDescription>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.streak ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Reviewed</CardDescription>
              <Brain className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalSeen ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">problems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Mastery</CardDescription>
              <Target className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.masteryPercentage ?? "—"}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">of seen problems</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Due Today</CardDescription>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.dueCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">items to review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Add Learning Material
              </CardTitle>
              <CardDescription>
                Upload a PDF, image, paste a note, or link a YouTube video to get an instant AI concept summary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Type Tabs */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {(["note", "pdf", "image", "youtube"] as UploadType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={uploadType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setUploadType(t);
                      setUploadError(null);
                    }}
                  >
                    {t === "note" && <FileText className="h-3.5 w-3.5 mr-1.5" />}
                    {t === "pdf" && <FileText className="h-3.5 w-3.5 mr-1.5" />}
                    {t === "image" && <ImageIcon className="h-3.5 w-3.5 mr-1.5" />}
                    {t === "youtube" && <Youtube className="h-3.5 w-3.5 mr-1.5" />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="material-title">Title</Label>
                  <Input
                    id="material-title"
                    placeholder="e.g. Integration by Parts Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                {uploadType === "note" && (
                  <div>
                    <Label htmlFor="note-content">Content</Label>
                    <textarea
                      id="note-content"
                      className="w-full min-h-[140px] rounded-md border bg-background p-3 text-sm resize-y"
                      placeholder="Paste your notes, lecture text, or study material here…"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      required
                    />
                  </div>
                )}

                {uploadType === "youtube" && (
                  <div>
                    <Label htmlFor="yt-url">YouTube URL</Label>
                    <Input
                      id="yt-url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      required
                    />
                  </div>
                )}

                {(uploadType === "pdf" || uploadType === "image") && (
                  <div>
                    <Label htmlFor="file-upload">
                      {uploadType === "pdf" ? "PDF File" : "Image (JPG or PNG)"}
                    </Label>
                    <Input
                      id="file-upload"
                      ref={fileInputRef}
                      type="file"
                      accept={uploadType === "pdf" ? "application/pdf" : "image/jpeg,image/png"}
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                      required
                    />
                  </div>
                )}

                {uploadError && (
                  <p className="text-sm text-destructive">{uploadError}</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? "Generating summary…" : "Upload & Summarise"}
                  </Button>
                  {(title || noteContent || youtubeUrl || selectedFile) && (
                    <Button type="button" variant="ghost" size="icon" onClick={resetForm}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Recent Materials */}
          {materials.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Recent Summaries</h2>
              {materials.map((m) => {
                const Icon = TYPE_ICONS[m.type] ?? FileText;
                const isExpanded = expandedId === m.id;
                return (
                  <Card key={m.id} className="overflow-hidden">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedId(isExpanded ? null : m.id)}
                    >
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <CardTitle className="text-sm font-medium truncate">{m.title}</CardTitle>
                            <Badge variant="outline" className="text-xs shrink-0">{m.type}</Badge>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground hidden sm:block">
                              {new Date(m.created_at).toLocaleDateString()}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </button>
                    {isExpanded && m.summary && (
                      <CardContent className="pt-0 pb-4 border-t">
                        <div className="prose prose-sm max-w-none text-sm text-foreground/90 whitespace-pre-wrap mt-3">
                          {m.summary}
                        </div>
                        {m.storage_url && m.type === "youtube" && (
                          <a
                            href={m.storage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-block text-xs text-primary hover:underline"
                          >
                            Open video ↗
                          </a>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Access</h2>
          <div className="space-y-2">
            {[
              { href: "/study", icon: Brain, label: "Spaced Review", desc: "Review due problems" },
              { href: "/topics", icon: Grid3x3, label: "Topics", desc: "Browse all math topics" },
              { href: "/chat", icon: Bot, label: "AI Tutor", desc: "Ask a math question" },
              { href: "/notebooks", icon: BookOpen, label: "Notebooks", desc: "Deep-dive source workspace", premium: true },
              { href: "/analytics", icon: BarChart3, label: "Analytics", desc: "Track your performance", premium: true },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.premium && (
                            <Badge variant="outline" className="text-[10px] py-0">PRO</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {stats && stats.dueCount > 0 && (
            <Card className="border-amber-300/50 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="py-3 px-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  You have {stats.dueCount} problem{stats.dueCount !== 1 ? "s" : ""} due for review.
                </p>
                <Link href="/study">
                  <Button size="sm" className="mt-2 w-full">
                    Start Review
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

