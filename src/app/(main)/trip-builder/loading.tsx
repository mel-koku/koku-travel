export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-primary border-r-transparent" />
        <p className="text-sm text-foreground-secondary">Loading trip builder...</p>
      </div>
    </div>
  );
}
