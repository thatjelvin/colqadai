"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InviteCodeCopy } from "@/components/groups/InviteCodeCopy";
import { GroupProgressDashboard } from "@/components/groups/GroupProgressDashboard";
import { GroupChallengeBanner } from "@/components/groups/GroupChallengeBanner";
import { GroupChat } from "@/components/groups/GroupChat";
import { ArrowLeft, Loader2, Users, LogOut } from "lucide-react";

interface GroupDetail {
  group: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    inviteCode: string;
    topicSlug: string | null;
    role: "owner" | "member";
  } | null;
  members: Array<{ id: string; userId: string; role: string; joinedAt: string }>;
  isMember: boolean;
  isOwner: boolean;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Group not found");
        throw new Error("Failed to load");
      }
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setLeaving(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (res.ok) {
        router.push("/groups");
      }
    } catch {
      // ignore
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !detail?.group) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center">
          <p className="text-sm text-red-600">{error || "Group not found"}</p>
          <Button variant="link" onClick={() => router.push("/groups")} className="mt-2">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  const { group, members, isMember, isOwner } = detail;

  if (!isMember) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-muted-foreground">You are not a member of this group.</p>
          <Button variant="link" onClick={() => router.push("/groups")} className="mt-2">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/groups")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <Badge variant={isOwner ? "default" : "secondary"} className="text-[10px]">
                {isOwner ? "Owner" : "Member"}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            disabled={leaving}
            className="text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-1" />
            {leaving ? "Leaving..." : "Leave"}
          </Button>
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
        </span>
        {group.topicSlug && (
          <Badge variant="outline">{group.topicSlug.replace(/-/g, " ")}</Badge>
        )}
      </div>

      {/* Invite Code */}
      {isOwner && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium mb-2">Share this invite code with classmates:</p>
          <InviteCodeCopy inviteCode={group.inviteCode} />
        </div>
      )}

      {/* Members Section */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Members ({members.length})</h2>
        <div className="flex flex-wrap gap-2">
          {members.map((m, i) => {
            const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank", "Ivy", "Jack"];
            const displayName = names[i % names.length] + m.userId.slice(-2);
            return (
              <Badge key={m.id} variant={m.role === "owner" ? "default" : "secondary"}>
                {displayName}
                {m.role === "owner" && " (owner)"}
              </Badge>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Challenges Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Challenges</h2>
          <GroupChallengeBanner groupId={groupId} onCreated={fetchDetail} />
        </div>
        <GroupProgressDashboard groupId={groupId} />
      </div>

      <Separator />

      {/* Chat Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Group Chat</h2>
        <GroupChat groupId={groupId} />
      </div>
    </div>
  );
}
