export default function ExploreTopicLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card p-5">
            <div className="mb-3 h-5 w-40 animate-pulse rounded-md bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-[90%] animate-pulse rounded-md bg-muted" />
              <div className="h-3 w-[80%] animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
