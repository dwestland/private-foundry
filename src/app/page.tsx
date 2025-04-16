'use server'
import { auth } from '@/auth'

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
      <p>User Info is a protected route</p>
    </div>
  )
}
