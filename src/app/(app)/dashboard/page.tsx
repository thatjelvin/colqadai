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
import { StreakChip } from "@/components/StreakChip";
import { ShareableProgressCard } from "@/components/shareable/ShareableProgressCard";
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
  Trophy,
} from "lucide-react";
import { getStreakMilestoneInfo } from "@/lib/learning/growthMindset";
import { ReviewDashboardSection } from "@/components/ReviewDashboardSection";

type OverviewStats = {
  totalSeen: number;
  masteredCount: number;
  masteryPercentage: number;
  dueCount: number;
  streak: number;
  longestStreak?: number;
  reviewedToday?: boolean;
  lastReviewDate?: string | null;
  reviewDayKeys?: string[];
  forecast?: Array<{ nextReviewAt: string | Date; forecastLabel: string }>;
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

/** Parse bold-section headings out of the AI summary for structured display. */
function parseSummarySections(text: string): { heading: string | null; body: string }[] {
  const lines = text.split("\n");
  const sections: { heading: string | null; body: string }[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^\*\*(.+?)\*\*\s*$/);
    if (headingMatch) {
      if (currentLines.length > 0 || currentHeading !== null) {
        sections.push({ heading: currentHeading, body: currentLines.join("\n").trim() });
      }
      currentHeading = headingMatch[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentLines.length > 0 || currentHeading !== null) {
    sections.push({ heading: currentHeading, body: currentLines.join("\n").trim() });
  }
  return sections.filter((s) => s.heading || s.body);
}

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

  // Determine greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) setStats(await res.json());
    } catch {
      setStats({
        totalSeen: 0,
        masteredCount: 0,
        masteryPercentage: 0,
        dueCount: 0,
        streak: 0,
        longestStreak: 0,
        reviewedToday: false,
        lastReviewDate: null,
      });
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            {userName
              ? `${getGreeting()}, ${userName.split(" ")[0]}`
              : "Dashboard"}
          </h1>
          <p className="text-muted-foreground">Your learning hub — upload material, review progress, or jump into practice.</p>
        </div>
        {stats && (
          <StreakChip
            current={stats.streak ?? 0}
            longest={stats.longestStreak ?? 0}
            reviewedToday={stats.reviewedToday ?? false}
            size="md"
            showLongest
            showMilestone
            showIdentity
          />
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800/40 dark:bg-orange-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-orange-700 dark:text-orange-300 font-medium">Streak</CardDescription>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats?.streak ?? "—"}</div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {stats?.reviewedToday ? "Reviewed today" : stats?.streak ? "Review today to keep it" : "days"}
              </span>
              {stats?.longestStreak !== undefined && stats.longestStreak > 0 && (
                <span>Best: {stats.longestStreak}</span>
              )}
            </div>
            {stats && getStreakMilestoneInfo(stats.streak).identityMessage && (
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 italic">
                {getStreakMilestoneInfo(stats.streak).identityMessage}
              </p>
            )}
            {stats && stats.streak > 0 && getStreakMilestoneInfo(stats.streak).next && (() => {
              const info = getStreakMilestoneInfo(stats.streak);
              if (!info.next) return null;
              return (
                <p className="text-xs text-muted-foreground mt-1">
                  {info.daysUntilNext} day{info.daysUntilNext !== 1 ? "s" : ""} until {info.next.badge}
                </p>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700 dark:text-blue-300 font-medium">Reviewed</CardDescription>
              <Brain className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalSeen ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">problems</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-green-700 dark:text-green-300 font-medium">Mastery</CardDescription>
              <Target className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats?.masteryPercentage ?? "—"}%</div>
            <p className="text-xs text-muted-foreground mt-0.5">of seen problems</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-700 dark:text-amber-300 font-medium">Due Today</CardDescription>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats?.dueCount ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">items to review</p>
          </CardContent>
        </Card>
      </div>

      {/* Review Dashboard */}
      {stats && (
        <ReviewDashboardSection
          reviewDayKeys={stats.reviewDayKeys ?? []}
          streak={stats.streak ?? 0}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Add Learning Material
              </CardTitle>
              <CardDescription>
                Upload your lecture notes, slides, or a YouTube link — Colqad will break it down for you.
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
                    {isUploading ? "Generating summary…" : "Upload & Summarize"}
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
        </div>

        {/* Recent Materials */}
        <div className="lg:col-span-1">
          {materials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recent Materials
                </CardTitle>
                <CardDescription>
                  Recently uploaded resources for quick access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const iconMap: Record<string, typeof FileText> = {
                            note: FileText,
                            pdf: FileText,
                            image: ImageIcon,
                            youtube: Youtube,
                          };
                          const Icon = iconMap[material.type] || FileText;
                          return (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{material.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.type === "youtube"
                              ? "YouTube video"
                              : material.type === "pdf"
                              ? "PDF document"
                              : material.type === "image"
                              ? "Image"
                              : "Note"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExpandedId(material.id)}
                        >
                          {expandedId === material.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedId === material.id && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        {material.summary ? (
                          <p>{material.summary}</p>
                        ) : (
                          <p className="italic">Summary generating...</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {materials.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground pt-4">
                    No materials uploaded yet. Add your first resource above!
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shareable Achievements */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="flex items-center justify-between pb-2">
              <h3 className="text-lg font-semibold text-foreground">
                Share Your Progress
              </h3>
              <div className="text-sm text-muted-foreground">
                Click to copy share text
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Streak Card */}
              {stats && (
                <ShareableProgressCard
                  type="streak"
                  title="Learning Streak"
                  subtitle="Consecutive days of practice"
                  value={stats.streak}
                  icon={<Flame className="h-4 w-4 text-orange-500" />}
                  gradient="from-orange-400 to-yellow-400"
                  shareText={`🔥 I'm on a ${stats.streak}-day learning streak on Colqad! Keeping my math skills sharp every day. #MathLearning #StudyStreak`}
                />
              )}

              {/* Problems Solved Card */}
              {stats && (
                <ShareableProgressCard
                  type="problems-solved"
                  title="Problems Solved"
                  subtitle="Total practice problems completed"
                  value={stats.totalSeen}
                  icon={<Bot className="h-4 w-4 text-blue-500" />}
                  gradient="from-blue-400 to-indigo-400"
                  shareText={`📊 I've solved ${stats.totalSeen} math problems on Colqad! Consistent practice makes perfect. #MathPractice #ProblemSolving`}
                />
              )}

              {/* Mastery Percentage Card */}
              {stats && (
                <ShareableProgressCard
                  type="topic-mastery"
                  title="Mastery Level"
                  subtitle="Percentage of problems mastered"
                  value={stats.masteryPercentage}
                  icon={<Target className="h-4 w-4 text-green-500" />}
                  gradient="from-green-400 to-emerald-400"
                  shareText={`🎯 I've mastered ${stats.masteryPercentage}% of the math problems I've practiced on Colqad! Steady progress toward expertise. #MathMastery #LearningJourney`}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
