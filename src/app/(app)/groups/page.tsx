"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupCreateForm } from "@/components/groups/GroupCreateForm";
import { GroupJoinForm } from "@/components/groups/GroupJoinForm";
import { Separator } from "@/components/ui/separator";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  topicSlug: string | null;
  role: "owner" | "member";
  inviteCode: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Study Groups</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create or join a study group to learn together with classmates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GroupCreateForm />
        <GroupJoinForm />
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Groups</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">You haven&apos;t joined any groups yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a new group or join one with an invite code.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                description={group.description}
                memberCount={group.memberCount}
                topicSlug={group.topicSlug}
                role={group.role}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
