'use server'
import { auth } from '@/auth'
import Link from 'next/link'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">next-15-prisma-auth</h1>
        <p>You are logged in</p>
        <p>Hello {session.user.name}</p>
        <p>User Info is a protected route</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">next-15-prisma-auth</h1>
      <p>You are NOT logged in</p>

      <Link
        href="/api/auth/signin"
        className="text-blue-500 hover:text-blue-700"
      >
        Sign In - /api/auth/signin
      </Link>
      <p>User Info is a protected route</p>
    </div>
  )
}
