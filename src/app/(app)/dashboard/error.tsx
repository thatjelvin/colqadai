"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Something went wrong loading your dashboard
      </h2>
      <p className="text-sm text-gray-500">{error.message}</p>
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
