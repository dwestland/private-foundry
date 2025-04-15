// This will run the Node.js runtime rather than the Edge runtime.
// next-auth v5 runs the Edge runtime and Prisma Adapter is not compatible with it.
export const runtime = 'nodejs'
import { handlers } from '@/auth'

export const { GET, POST } = handlers

// Had a lot of problems with this, a lot of incomplete and wrong information out there
// This gave me a little direction for next-auth v5 and prisma adapter middleware
// https://authjs.dev/getting-started/session-management/protecting?framework=next-js
