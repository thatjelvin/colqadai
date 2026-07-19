"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface GroupCardProps {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  topicSlug: string | null;
  role: "owner" | "member";
}

export function GroupCard({ id, name, description, memberCount, topicSlug, role }: GroupCardProps) {
  return (
    <Link href={`/groups/${id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{name}</CardTitle>
            <Badge variant={role === "owner" ? "default" : "secondary"} className="text-[10px]">
              {role === "owner" ? "Owner" : "Member"}
            </Badge>
          </div>
          {description && (
            <CardDescription className="text-sm line-clamp-2">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
            {topicSlug && (
              <Badge variant="outline" className="text-[10px]">
                {topicSlug.replace(/-/g, " ")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
