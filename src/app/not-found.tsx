import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border-4 border-dashed border-red-500 text-3xl font-bold text-red-500">
          404
        </div>
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="mb-8 text-gray-600">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="primary">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Explore places</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

