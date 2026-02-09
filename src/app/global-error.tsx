'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error using centralized logger
    logger.error('Global error boundary triggered', error, {
      digest: error.digest,
      message: error.message,
      stack: error.stack,
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
          <div className="w-full max-w-md rounded-lg bg-background p-8 shadow-lg text-center">
            <h2 className="mb-4 font-serif italic text-2xl text-foreground">
              Application Error
            </h2>
            <p className="mb-6 text-sm text-foreground-secondary">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
