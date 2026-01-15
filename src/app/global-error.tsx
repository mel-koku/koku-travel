'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- Global error boundary requires console for error reporting
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Application Error
            </h2>
            <p className="mb-6 text-sm text-gray-600">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
