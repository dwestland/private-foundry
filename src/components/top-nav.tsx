import Link from 'next/link'
import React from 'react'
import { SignOutButton } from './sign-out-button'
import { auth } from '@/auth'

async function TopNav() {
  const session = await auth()
  return (
    <header className="container bg-blue-200 p-4">
      <nav className="mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <Link href="/user-info" className="hover:underline">
            User Info
          </Link>
          <Link href="/todos" className="hover:underline">
            Todos
          </Link>
          <Link href="/messages" className="hover:underline">
            Messages
          </Link>
          <Link href="/chat" className="hover:underline">
            Chat
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {session?.user ? (
            <SignOutButton />
          ) : (
            <Link href="/auth/signin" className="hover:underline">
              Sign In
            </Link>
          )}
          {/* <Link href="/auth/signin" className="hover:underline">
            Sign In
          </Link>
          <SignOutButton /> */}
        </div>
      </nav>
    </header>
  )
}

export default TopNav
