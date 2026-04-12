# COLQAD CODE PATTERNS SKILL
# Copy-paste correct patterns for every common task in this app.
# Never write auth or database code from scratch — use these patterns.

---

## AUTH PATTERNS

### Get current user in a SERVER component or API route:
```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function ProtectedPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }
  
  // userId is now safe to use — format: "user_xxxxxxxxxxxxxxxxxx"
  return <div>Hello {userId}</div>
}
```

### Get current user in a CLIENT component:
```typescript
'use client'
import { useUser } from '@clerk/nextjs'

export default function ClientComponent() {
  const { user, isLoaded, isSignedIn } = useUser()
  
  if (!isLoaded) return <div>Loading...</div>
  if (!isSignedIn) return null
  
  return <div>Hello {user.fullName}</div>
}
```

### Sign out button (client component):
```typescript
'use client'
import { useClerk } from '@clerk/nextjs'

export default function SignOutButton() {
  const { signOut } = useClerk()
  
  return (
    <button onClick={() => signOut({ redirectUrl: '/' })}>
      Sign out
    </button>
  )
}
```

---

## DATABASE PATTERNS

### Fetch data for the current user (server component):
```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default async function Page() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
    .eq('clerk_user_id', userId)
  
  if (error) {
    console.error('Supabase error:', error)
    return <div>Error loading data</div>
  }
  
  return <div>{JSON.stringify(data)}</div>
}
```

### Create or get user profile on first visit:
```typescript
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

async function getOrCreateProfile(userId: string) {
  // Try to get existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single()
  
  if (existing) return existing
  
  // Create new profile if doesn't exist
  const { data: created, error } = await supabase
    .from('profiles')
    .insert({
      clerk_user_id: userId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create profile: ${error.message}`)
  return created
}

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  
  const profile = await getOrCreateProfile(userId)
  
  return <Dashboard profile={profile} />
}
```

### Insert data linked to current user:
```typescript
const { userId } = await auth()
if (!userId) throw new Error('Not authenticated')

const { data, error } = await supabase
  .from('math_sessions')
  .insert({
    clerk_user_id: userId,
    topic: 'calculus',
    score: 85,
    created_at: new Date().toISOString(),
  })
  .select()
  .single()
```

### Update data for current user:
```typescript
const { userId } = await auth()

const { error } = await supabase
  .from('math_sessions')
  .update({ score: 90 })
  .eq('id', sessionId)
  .eq('clerk_user_id', userId) // always scope updates to the current user
```

---

## PAGE PATTERNS

### Protected dashboard page with loading and error states:
```typescript
// src/app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { data: sessions } = await supabase
    .from('math_sessions')
    .select('*')
    .eq('clerk_user_id', userId)
    .order('created_at', { ascending: false })

  return (
    <main>
      <h1>Your Dashboard</h1>
      {sessions?.length === 0 && (
        <p>No sessions yet. Start your first practice session.</p>
      )}
      {sessions?.map(session => (
        <div key={session.id}>{session.topic}</div>
      ))}
    </main>
  )
}

// src/app/dashboard/loading.tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  )
}

// src/app/dashboard/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Public page (no auth needed):
```typescript
// No auth() call needed
export default function HomePage() {
  return <main>Welcome to Colqad</main>
}
```

---

## MIDDLEWARE PATTERN (never change this unless instructed)

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()
  const { pathname } = request.nextUrl

  // Redirect logged-in users away from auth pages
  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect all non-public routes
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## LAYOUT PATTERN (ClerkProvider must be outermost)

```typescript
// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Colqad',
  description: 'AI-powered math learning for UK university students',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

---

## SUPABASE CLIENT PATTERN (database only, no auth)

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## SIGN IN / SIGN UP PAGE PATTERNS

```typescript
// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}

// src/app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
```

---

## WHAT NEVER TO DO

```typescript
// WRONG — old Supabase auth, completely removed
const { data: { user } } = await supabase.auth.getUser()
const { data: { session } } = await supabase.auth.getSession()
await supabase.auth.signInWithOAuth({ provider: 'google' })
await supabase.auth.signOut()

// WRONG — NextAuth, not used in this app
import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'

// WRONG — using hooks in server components
export default async function Page() {
  const { user } = useUser() // hooks don't work in server components
}

// WRONG — using async/await in client components at top level
'use client'
export default async function Page() { // async client components don't work
  const { userId } = await auth()
}

// WRONG — Clerk v7 import (only works with Next.js 15)
import { clerkMiddleware } from '@clerk/nextjs/server' // fine in v5 too, but
// never install @clerk/nextjs above version 5.x.x
```
