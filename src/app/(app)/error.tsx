"use client";

import { useEffect } from "react";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error("SIGNUP ERROR: app segment failure", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-xl font-semibold text-gray-900">
        We hit an issue loading your account
      </h2>
      <p className="max-w-md text-sm text-gray-500">
        Please try again. If this keeps happening, sign out and sign back in.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
