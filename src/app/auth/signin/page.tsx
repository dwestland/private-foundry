import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const session = await auth()

  // Redirect to home if already logged in
  if (session?.user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold">Sign In</h1>
        <div className="flex flex-col space-y-2">
          <form
            action={async () => {
              'use server'
              await signIn('github', { redirectTo: '/' })
            }}
          >
            <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400">
              Sign in with GitHub
            </button>
          </form>

          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400">
              Sign in with Google
            </button>
          </form>

          <form
            action={async (formData: FormData) => {
              'use server'
              const email = formData.get('email')
              if (typeof email !== 'string' || !email) {
                throw new Error('Missing email from request body.')
              }
              await signIn('resend', { email, redirectTo: '/' })
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="flex-1 px-3 py-2 border rounded text-[#0a0a0a]"
              required
            />
            <br />
            <button className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400">
              Sign in with Email
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
