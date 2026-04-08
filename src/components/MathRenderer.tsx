"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderMath = () => {
      const container = containerRef.current;
      if (!container) return;

      // Clear container
      container.innerHTML = "";

      // Parse content and render math
      const parts = parseContent(content);
      
      parts.forEach((part) => {
        if (part.type === "text") {
          const textNode = document.createTextNode(part.content);
          container.appendChild(textNode);
        } else if (part.type === "inline-math") {
          const span = document.createElement("span");
          try {
            katex.render(part.content, span, {
              throwOnError: false,
              displayMode: false,
            });
          } catch {
            span.textContent = `$${part.content}$`;
          }
          container.appendChild(span);
        } else if (part.type === "display-math") {
          const div = document.createElement("div");
          div.className = "my-4";
          try {
            katex.render(part.content, div, {
              throwOnError: false,
              displayMode: true,
            });
          } catch {
            div.textContent = `$$${part.content}$$`;
          }
          container.appendChild(div);
        }
      });
    };

    renderMath();
  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`prose prose-slate max-w-none ${className}`}
    />
  );
}

type Part =
  | { type: "text"; content: string }
  | { type: "inline-math"; content: string }
  | { type: "display-math"; content: string };

function parseContent(content: string): Part[] {
  const parts: Part[] = [];
  // Regular expressions for LaTeX delimiters
  const displayMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const inlineMathRegex = /\$([^$\n]+?)\$/g;

  // Find all math expressions
  const matches: Array<{
    type: "inline" | "display";
    content: string;
    index: number;
    length: number;
  }> = [];

  let match;
  while ((match = displayMathRegex.exec(content)) !== null) {
    matches.push({
      type: "display",
      content: match[1].trim(),
      index: match.index,
      length: match[0].length,
    });
  }

  while ((match = inlineMathRegex.exec(content)) !== null) {
    // Check if this match is inside a display math block
    const isInsideDisplay = matches.some(
      (m) =>
        m.type === "display" &&
        match!.index >= m.index &&
        match!.index < m.index + m.length
    );

    if (!isInsideDisplay) {
      matches.push({
        type: "inline",
        content: match[1].trim(),
        index: match.index,
        length: match[0].length,
      });
    }
  }

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build parts array
  let lastIndex = 0;
  for (const m of matches) {
    if (m.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, m.index),
      });
    }
    parts.push({
      type: m.type === "inline" ? "inline-math" : "display-math",
      content: m.content,
    });
    lastIndex = m.index + m.length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: "text", content }];
}
