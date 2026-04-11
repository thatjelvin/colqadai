# Colqad

**Colqad** is a math-first AI learning environment — a notebook, tutor, and practice engine unified into a single product. It combines spaced repetition with an AI tutor to help students truly understand mathematics.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL via Supabase |
| **ORM** | Prisma |
| **Auth** | Supabase Auth (Google OAuth + Email/Password) |
| **AI** | Anthropic Claude (AI Tutor) |
| **Email** | Resend |
| **Payments** | Paddle |
| **Caching** | Upstash Redis |
| **Error Monitoring** | Sentry |
| **Styling** | Tailwind CSS |
| **UI Components** | Radix UI + shadcn/ui |
| **Math Rendering** | KaTeX |
| **Deployment** | Vercel |

## Features

- **Spaced Repetition** — SM-2 algorithm schedules problems at optimal review intervals
- **AI Tutor Chat** — Anthropic Claude provides step-by-step math explanations with LaTeX
- **Practice Engine** — Problems at multiple difficulty levels with instant feedback
- **Topic Browser** — Hierarchical topic tree covering calculus, linear algebra, and more
- **Progress Dashboard** — Track mastery, streaks, and weak areas
- **Math Rendering** — KaTeX for beautiful inline and display math
- **Source Pipeline Notebooks** — Upload text/PDF sources, ingest chunks, generate grounded summaries, and extract concepts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase project)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/colqad.git
   cd colqad
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in your credentials in `.env`.

4. **Generate Prisma client and push schema**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Seed the database** (optional)
   ```bash
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to see Colqad.

## Project Structure

```

## Learning Science Feature Map

- Spaced repetition: `src/lib/sm2.ts`, `src/app/api/problems/[id]/review/route.ts`, `src/app/api/problems/due/route.ts`
- Retrieval practice: `src/app/(app)/study/[problemId]/page.tsx`, `src/app/api/problems/[id]/attempt/route.ts`
- Interleaving: `src/lib/learning/interleaving.ts`, `src/app/api/study/session/route.ts`, `src/app/(app)/study/page.tsx`
- Elaborative interrogation: `src/lib/learning/aiClassifiers.ts`, `src/app/api/reflections/route.ts`, `src/app/(app)/reflections/page.tsx`
- Worked-example mode: `src/app/(app)/study/[problemId]/page.tsx`, `src/app/api/problems/[id]/worked-example/route.ts`
- Error analysis: `src/app/api/errors/log/route.ts`, `src/app/(app)/error-log/page.tsx`, `src/app/(app)/dashboard/page.tsx`

colqad/
├── prisma/              # Prisma schema and seed data
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── (app)/       # Authenticated app routes
│   │   ├── (auth)/      # Login and registration
│   │   └── api/         # API routes
│   ├── components/      # React components
│   │   └── ui/          # shadcn/ui primitives
│   └── lib/             # Shared utilities
│       ├── analytics/   # Analytics abstraction (PostHog/Datadog)
│       ├── auth/        # Auth abstraction (Auth0/Clerk)
│       ├── email/       # Resend integration
│       ├── payments/    # Paddle integration
│       ├── redis/       # Upstash Redis client
│       └── supabase/    # Supabase client
├── __tests__/           # Unit tests
├── sentry.*.config.ts   # Sentry configuration
└── middleware.ts        # Supabase auth middleware
```

## Architecture Notes

- **Authentication**: Uses Supabase Auth for Google OAuth and email/password sessions.
- **Analytics**: An abstraction layer (`lib/analytics/AnalyticsService.ts`) supports future integration with PostHog or Datadog.
- **Payments**: All payment logic goes through Paddle (`lib/payments/paddle.ts`).
- **Vector Database**: Not currently integrated. Can be added later if needed.

## License

See [LICENSE](./LICENSE) for details.
