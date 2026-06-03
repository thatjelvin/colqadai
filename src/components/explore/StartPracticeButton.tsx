"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

export function StartPracticeButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-12 w-full text-base font-semibold sm:w-auto sm:min-w-56"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing review...
        </>
      ) : (
        <>
          Start Review
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}
