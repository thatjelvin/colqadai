import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserForClerkId } from "@/lib/clerk-db-user";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const dbUser = await getOrCreateUserForClerkId(clerkUserId);
    const userId = dbUser.id;

    const chatSessions = await prisma.chatSession.findMany({
      where: {
        userId,
        problemId: null, // Only freeform chats
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}
