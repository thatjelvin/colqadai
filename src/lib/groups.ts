import { db } from "@/lib/db";

type DbRecord = Record<string, unknown>;
type DbModelDelegate = {
  findMany(args?: Record<string, unknown>): Promise<DbRecord[]>;
  findFirst(args?: Record<string, unknown>): Promise<DbRecord | null>;
  create(args?: Record<string, unknown>): Promise<DbRecord>;
  update(args?: Record<string, unknown>): Promise<DbRecord>;
  delete(args?: Record<string, unknown>): Promise<DbRecord>;
};
type PrismaLikeClient = {
  studyGroup: DbModelDelegate;
  studyGroupMember: DbModelDelegate;
  studyGroupChallenge: DbModelDelegate;
  studyGroupChallengeProgress: DbModelDelegate;
  studyGroupMessage: DbModelDelegate;
};
const dbClient = db as unknown as PrismaLikeClient;

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  topicSlug: string | null;
  memberCount: number;
  inviteCode: string;
  createdBy: string;
  role?: "owner" | "member";
}

export interface GroupMember {
  id: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface GroupChallenge {
  id: string;
  groupId: string;
  title: string;
  description: string | null;
  topicSlugs: string[];
  problemCount: number;
  status: "active" | "completed" | "cancelled";
  dueBy: string;
  myProgress: number;
  memberCount: number;
  createdBy: string;
}

export async function createGroup(
  userId: string,
  name: string,
  description?: string,
  topicSlug?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!name || name.trim().length < 2) {
    return { success: false, error: "Group name must be at least 2 characters." };
  }

  let inviteCode = generateInviteCode();
  // Ensure uniqueness
  let attempts = 0;
  while (attempts < 10) {
    const existing = await dbClient.studyGroup.findFirst({ where: { inviteCode } });
    if (!existing) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const group = await dbClient.studyGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      topicSlug: topicSlug || null,
      createdBy: userId,
      inviteCode,
    },
  }) as DbRecord;

  // Add creator as owner
  await dbClient.studyGroupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: "owner",
      joinedAt: new Date(),
    },
  });

  return { success: true, id: group.id as string };
}

export async function joinGroup(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  const group = await dbClient.studyGroup.findFirst({
    where: { inviteCode: inviteCode.toUpperCase().trim() },
    select: { id: true, name: true },
  }) as DbRecord | null;

  if (!group) {
    return { success: false, error: "Invalid invite code." };
  }

  // Check not already a member
  const existing = await dbClient.studyGroupMember.findFirst({
    where: { groupId: group.id, userId },
  }) as DbRecord | null;

  if (existing) {
    return { success: false, error: "You are already a member of this group." };
  }

  await dbClient.studyGroupMember.create({
    data: {
      groupId: group.id,
      userId,
      role: "member",
      joinedAt: new Date(),
    },
  });

  return { success: true, groupId: group.id as string };
}

export async function getUserGroups(userId: string): Promise<GroupInfo[]> {
  const memberships = await dbClient.studyGroupMember.findMany({
    where: { userId },
    select: { groupId: true, role: true },
  }) as DbRecord[];

  if (memberships.length === 0) return [];

  const groups: GroupInfo[] = [];

  for (const m of memberships) {
    const group = await dbClient.studyGroup.findFirst({
      where: { id: m.groupId as string },
      select: { id: true, name: true, description: true, topicSlug: true, inviteCode: true, createdBy: true },
    }) as DbRecord | null;

    if (!group) continue;

    // Count members
    const members = await dbClient.studyGroupMember.findMany({
      where: { groupId: group.id },
      select: { id: true },
    }) as DbRecord[];

    groups.push({
      id: group.id as string,
      name: group.name as string,
      description: group.description as string | null,
      topicSlug: group.topicSlug as string | null,
      memberCount: members.length,
      inviteCode: group.inviteCode as string,
      createdBy: group.createdBy as string,
      role: m.role as "owner" | "member",
    });
  }

  return groups;
}

export async function getGroupDetail(
  groupId: string,
  currentUserId: string
): Promise<{
  group: GroupInfo | null;
  members: GroupMember[];
  isMember: boolean;
  isOwner: boolean;
}> {
  const group = await dbClient.studyGroup.findFirst({
    where: { id: groupId },
    select: { id: true, name: true, description: true, topicSlug: true, inviteCode: true, createdBy: true },
  }) as DbRecord | null;

  if (!group) {
    return { group: null, members: [], isMember: false, isOwner: false };
  }

  const memberRecords = await dbClient.studyGroupMember.findMany({
    where: { groupId },
    select: { id: true, userId: true, role: true, joinedAt: true },
  }) as DbRecord[];

  const members: GroupMember[] = memberRecords.map((r) => ({
    id: r.id as string,
    userId: r.userId as string,
    role: (r.role as string) === "owner" ? "owner" : "member",
    joinedAt: (r.joinedAt as Date).toISOString(),
  }));

  const membership = members.find((m) => m.userId === currentUserId);

  return {
    group: {
      id: group.id as string,
      name: group.name as string,
      description: group.description as string | null,
      topicSlug: group.topicSlug as string | null,
      memberCount: members.length,
      inviteCode: group.inviteCode as string,
      createdBy: group.createdBy as string,
      role: membership?.role ?? "member",
    },
    members,
    isMember: !!membership,
    isOwner: membership?.role === "owner",
  };
}

export async function leaveGroup(
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const membership = await dbClient.studyGroupMember.findFirst({
    where: { groupId, userId },
  }) as DbRecord | null;

  if (!membership) {
    return { success: false, error: "You are not a member of this group." };
  }

  // Count owners
  const owners = await dbClient.studyGroupMember.findMany({
    where: { groupId, role: "owner" },
  }) as DbRecord[];

  if (membership.role === "owner" && owners.length <= 1) {
    // Last owner: delete group entirely
    const messages = await dbClient.studyGroupMessage.findMany({ where: { groupId } }) as DbRecord[];
    for (const m of messages) await dbClient.studyGroupMessage.delete({ where: { id: m.id } });
    const challenges = await dbClient.studyGroupChallenge.findMany({ where: { groupId } }) as DbRecord[];
    for (const c of challenges) {
      const progress = await dbClient.studyGroupChallengeProgress.findMany({ where: { challengeId: c.id } }) as DbRecord[];
      for (const p of progress) await dbClient.studyGroupChallengeProgress.delete({ where: { id: p.id } });
      await dbClient.studyGroupChallenge.delete({ where: { id: c.id } });
    }
    const members = await dbClient.studyGroupMember.findMany({ where: { groupId } }) as DbRecord[];
    for (const m of members) await dbClient.studyGroupMember.delete({ where: { id: m.id } });
    await dbClient.studyGroup.delete({ where: { id: groupId } });
  } else {
    await dbClient.studyGroupMember.delete({ where: { id: membership.id } });
  }

  return { success: true };
}

export async function deleteGroup(
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  const group = await dbClient.studyGroup.findFirst({
    where: { id: groupId, createdBy: userId },
  }) as DbRecord | null;

  if (!group) {
    return { success: false, error: "Group not found or not owned by you." };
  }

  // Cascade delete
  const messages = await dbClient.studyGroupMessage.findMany({ where: { groupId } }) as DbRecord[];
  for (const m of messages) await dbClient.studyGroupMessage.delete({ where: { id: m.id } });
  const challenges = await dbClient.studyGroupChallenge.findMany({ where: { groupId } }) as DbRecord[];
  for (const c of challenges) {
    const progress = await dbClient.studyGroupChallengeProgress.findMany({ where: { challengeId: c.id } }) as DbRecord[];
    for (const p of progress) await dbClient.studyGroupChallengeProgress.delete({ where: { id: p.id } });
    await dbClient.studyGroupChallenge.delete({ where: { id: c.id } });
  }
  const members = await dbClient.studyGroupMember.findMany({ where: { groupId } }) as DbRecord[];
  for (const m of members) await dbClient.studyGroupMember.delete({ where: { id: m.id } });
  await dbClient.studyGroup.delete({ where: { id: groupId } });

  return { success: true };
}

export async function createChallenge(
  userId: string,
  groupId: string,
  title: string,
  description?: string,
  topicSlugs?: string[],
  problemCount?: number,
  dueBy?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  // Verify membership
  const member = await dbClient.studyGroupMember.findFirst({
    where: { groupId, userId },
  }) as DbRecord | null;

  if (!member) {
    return { success: false, error: "You are not a member of this group." };
  }

  const endDate = dueBy ? new Date(dueBy) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const group = await dbClient.studyGroup.findFirst({
    where: { id: groupId },
    select: { id: true },
  }) as DbRecord | null;

  if (!group) {
    return { success: false, error: "Group not found." };
  }

  const challenge = await dbClient.studyGroupChallenge.create({
    data: {
      groupId,
      title: title.trim(),
      description: description?.trim() || null,
      topicSlugs: topicSlugs || [],
      problemCount: problemCount || 10,
      createdBy: userId,
      status: "active",
      endsAt: endDate,
    },
  }) as DbRecord;

  return { success: true, id: challenge.id as string };
}

export async function getGroupChallenges(
  groupId: string,
  userId: string
): Promise<GroupChallenge[]> {
  const challenges = await dbClient.studyGroupChallenge.findMany({
    where: { groupId },
    select: {
      id: true,
      groupId: true,
      title: true,
      description: true,
      topicSlugs: true,
      problemCount: true,
      createdBy: true,
      status: true,
      endsAt: true,
    },
    orderBy: { createdAt: "desc" },
  }) as DbRecord[];

  const members = await dbClient.studyGroupMember.findMany({
    where: { groupId },
    select: { id: true },
  }) as DbRecord[];

  const results: GroupChallenge[] = [];

  for (const c of challenges) {
    // Get my progress
    const progress = await dbClient.studyGroupChallengeProgress.findFirst({
      where: { challengeId: c.id as string, userId },
    }) as DbRecord | null;

    results.push({
      id: c.id as string,
      groupId: c.groupId as string,
      title: c.title as string,
      description: c.description as string | null,
      topicSlugs: (c.topicSlugs as string[]) || [],
      problemCount: (c.problemCount as number) || 10,
      status: (c.status as string) as "active" | "completed" | "cancelled",
      dueBy: (c.endsAt as Date).toISOString(),
      myProgress: (progress?.problemsCompleted as number) ?? 0,
      memberCount: members.length,
      createdBy: c.createdBy as string,
    });
  }

  return results;
}

export async function updateChallengeProgress(
  challengeId: string,
  userId: string,
  increment: number = 1
): Promise<void> {
  const existing = await dbClient.studyGroupChallengeProgress.findFirst({
    where: { challengeId, userId },
  }) as DbRecord | null;

  if (existing) {
    const newCount = ((existing.problemsCompleted as number) || 0) + increment;
    await dbClient.studyGroupChallengeProgress.update({
      where: { id: existing.id },
      data: { problemsCompleted: newCount },
    });
  } else {
    await dbClient.studyGroupChallengeProgress.create({
      data: {
        challengeId,
        userId,
        problemsCompleted: increment,
        completedAt: null,
      },
    });
  }
}

export async function getMessages(
  groupId: string,
  limit: number = 50
): Promise<Array<{ id: string; userId: string; content: string; createdAt: string }>> {
  const messages = await dbClient.studyGroupMessage.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, userId: true, content: true, createdAt: true },
  }) as DbRecord[];

  return messages.reverse().map((m) => ({
    id: m.id as string,
    userId: m.userId as string,
    content: m.content as string,
    createdAt: (m.createdAt as Date).toISOString(),
  }));
}

export async function sendMessage(
  groupId: string,
  userId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  if (!content.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  // Verify membership
  const member = await dbClient.studyGroupMember.findFirst({
    where: { groupId, userId },
  }) as DbRecord | null;

  if (!member) {
    return { success: false, error: "You are not a member of this group." };
  }

  await dbClient.studyGroupMessage.create({
    data: {
      groupId,
      userId,
      content: content.trim(),
    },
  });

  return { success: true };
}
