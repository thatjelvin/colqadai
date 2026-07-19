"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageCircle } from "lucide-react";

interface Message {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

interface GroupChatProps {
  groupId: string;
}

const anonymousNames: Record<string, string> = {};

function getDisplayName(userId: string, index: number): string {
  if (!anonymousNames[userId]) {
    const names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank", "Ivy", "Jack"];
    anonymousNames[userId] = names[index % names.length] + userId.slice(-2);
  }
  return anonymousNames[userId];
}

export function GroupChat({ groupId }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Group Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-y-auto p-3" ref={scrollRef}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary">
                      {getDisplayName(msg.userId, index)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t">
        <form onSubmit={handleSend} className="flex w-full gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
