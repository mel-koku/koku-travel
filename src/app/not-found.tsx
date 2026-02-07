import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-destructive text-3xl font-bold text-destructive">
          404
        </div>
        <h1 className="mb-4 text-3xl font-bold text-charcoal">Page not found</h1>
        <p className="mb-8 text-warm-gray">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="primary" href="/">
            Go home
          </Button>
          <Button variant="outline" href="/explore">
            Explore places
          </Button>
        </div>
      </div>
    </div>
  );
}

