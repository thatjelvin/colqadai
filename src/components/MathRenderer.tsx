import { Fragment } from "react";
import { BlockMath, InlineMath } from "react-katex";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  content: string;
  className?: string;
}

type MathToken =
  | { type: "text"; value: string }
  | { type: "inline"; value: string }
  | { type: "block"; value: string };

function tokenizeMath(content: string): MathToken[] {
  if (!content) {
    return [{ type: "text", value: "" }];
  }

  const matches = [...content.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)];
  if (matches.length === 0) {
    return [{ type: "text", value: content }];
  }

  const tokens: MathToken[] = [];
  let cursor = 0;

  for (const match of matches) {
    const index = match.index ?? 0;

    if (index > cursor) {
      tokens.push({ type: "text", value: content.slice(cursor, index) });
    }

    if (typeof match[1] === "string") {
      tokens.push({ type: "block", value: match[1].trim() });
    } else if (typeof match[2] === "string") {
      tokens.push({ type: "inline", value: match[2].trim() });
    }

    cursor = index + match[0].length;
  }

  if (cursor < content.length) {
    tokens.push({ type: "text", value: content.slice(cursor) });
  }

  return tokens;
}

export function MathRenderer({ content, className }: MathRendererProps) {
  const tokens = tokenizeMath(content);

  return (
    <div className={cn("leading-7", className)}>
      {tokens.map((token, index) => {
        if (token.type === "block") {
          return (
            <div key={`math-block-${index}`} className="my-4 overflow-x-auto">
              <BlockMath math={token.value} errorColor="#dc2626" />
            </div>
          );
        }

        if (token.type === "inline") {
          return (
            <InlineMath key={`math-inline-${index}`} math={token.value} errorColor="#dc2626" />
          );
        }

        const lines = token.value.split("\n");
        return (
          <Fragment key={`math-text-${index}`}>
            {lines.map((line, lineIndex) => (
              <Fragment key={`line-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
