"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState<{
    plan: string;
    usage: { chatMessages: { used: number; limit: number } };
  } | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchUsage();
  }, [fetchSessions]);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/billing/usage");
      if (response.ok) {
        setUsage(await response.json());
      }
    } catch (error) {
      console.error("Error fetching usage:", error);
    }
  };

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    setSessionMessages([]);
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionMessages(
          (data.messages ?? []).map(
            (m: { id: string; role: string; content: string }) => ({
              id: m.id,
              role: m.role as "USER" | "ASSISTANT",
              content: m.content,
            })
          )
        );
      }
    } catch (error) {
      console.error("Error loading session messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setSelectedSessionId(null);
    setSessionMessages([]);
    fetchSessions();
  }, [fetchSessions]);

  const handleSessionSelect = useCallback(
    (sessionId: string) => {
      setSelectedSessionId(sessionId);
      loadSessionMessages(sessionId);
    },
    [loadSessionMessages]
  );

  const handleSessionCreated = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="h-full flex">
      {/* Sidebar with chat history */}
      <div className="w-64 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          {usage && (
            <div className="mb-3 rounded-md border p-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span>Plan</span>
                <Badge variant={usage.plan === "free" ? "outline" : "default"}>
                  {usage.plan.toUpperCase()}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                Chat usage: {usage.usage.chatMessages.used}/{usage.usage.chatMessages.limit}
              </div>
              {usage.plan === "free" && (
                <Link href="/pricing" className="mt-1 inline-block text-primary hover:underline">
                  Unlock higher limits
                </Link>
              )}
            </div>
          )}
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Loading...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 px-4 text-center text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">No previous sessions</p>
                <p>Ask me anything about your math — problems, concepts, or your upcoming exam.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSessionSelect(session.id)}
                  className={`w-full text-left p-3 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    selectedSessionId === session.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{session.title || "New Chat"}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex-1 p-6">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Loading conversation…
          </div>
        ) : (
          <ChatInterface
            key={selectedSessionId ?? "new"}
            sessionId={selectedSessionId || undefined}
            initialMessages={sessionMessages}
            onNewChat={handleNewChat}
            onSessionCreated={handleSessionCreated}
          />
        )}
      </div>
    </div>
  );
}

