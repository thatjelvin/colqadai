"use client";

import { FormEvent, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function FloatingTutorHelp({ currentTopicName }: { currentTopicName: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) {
      return;
    }

    setInput("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content }]);

    try {
      const response = await fetch("/api/tutor-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, currentTopicName }),
      });

      if (!response.ok) {
        throw new Error("Failed");
      }

      const payload = await response.json();
      const assistantMessage = typeof payload?.message === "string" ? payload.message : "I couldn’t answer that yet.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry — I’m having trouble right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <Card className="w-[320px] shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Ask for help</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border bg-muted/20 p-2 text-sm">
              {messages.length === 0 ? (
                <p className="text-muted-foreground">Ask a question about this topic.</p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === "user" ? "text-right" : "text-left"}
                  >
                    <span
                      className={`inline-block rounded-md px-2 py-1 ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background border"
                      }`}
                    >
                      {message.content}
                    </span>
                  </div>
                ))
              )}
              {isLoading ? <p className="text-muted-foreground">Thinking…</p> : null}
            </div>
            <form className="flex items-center gap-2" onSubmit={handleSubmit}>
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask your question..."
              />
              <Button type="submit" size="icon" disabled={isLoading || input.trim().length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg"
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-label="Ask for help"
        >
          <Bot className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
