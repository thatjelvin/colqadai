# COLQAD CODE PATTERNS

Use these patterns for auth and user-scoped data.

## Auth Patterns

### Server route/page auth guard

```typescript
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export default async function ProtectedPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <div>Hello {user.email}</div>;
}
```

### Browser email sign-in

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
```

### Browser email sign-up with confirmation callback

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${location.origin}/auth/callback`,
  },
});
if (error) throw error;
```

### Google OAuth sign-in

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${location.origin}/auth/callback`,
  },
});
```

### OAuth/email callback exchange route

```typescript
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const supabase = createServerClient();
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
```

## User Mapping Pattern

```typescript
import { getOrCreateUserForSupabaseId } from "@/lib/supabase-db-user";

const dbUser = await getOrCreateUserForSupabaseId(
  user.id,
  user.email!,
  (user.user_metadata?.full_name as string | undefined) ?? null
);
```

## API Route Auth Pattern

```typescript
import { createServerClient } from "@/lib/supabase/server";

const supabase = createServerClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return new Response("Unauthorized", { status: 401 });
}
```

## Middleware Pattern

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Keep callback and auth pages public.
const publicPaths = ["/", "/login", "/register", "/auth/callback"];
```

## Do Not Do

- Do not query by User.id using the Supabase auth id.
- Do not skip callback route for OAuth.
- Do not mix auth providers.
