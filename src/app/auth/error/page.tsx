'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-4xl font-bold text-red-500">Error</h1>
      <p className="text-gray-600">Authentication error: {error}</p>
      <Link href="/" className="text-blue-500 hover:underline">
        Return to home
      </Link>
    </div>
  )
}

export default function ErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  )
}
