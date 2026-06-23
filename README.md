# Furrow

Market-intelligence web app for row-crop farmers (corn + soybeans, Illinois
first). A precision instrument for the farm's money and market decisions.
Multi-tenant SaaS from day one, dogfooded by one real 5,000-acre farm.

**Stack:** Next.js 16 (App Router, TS, `src/`) · Supabase (Postgres + PostGIS +
Auth) · Tailwind v4 · shadcn/ui · Geist · Framer Motion · Recharts · Vercel.

> **Status: Phase 1 — foundation.** Auth, design system, app shell, and the
> full multi-tenant schema are in. Fields/Markets/Inputs/News are intentional
> empty-state placeholders. No data features yet.

## Getting started

1. **Create a Supabase project** (free tier is fine) at supabase.com.

2. **Apply the schema.** In the Supabase dashboard → SQL Editor, paste and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It
   enables PostGIS, creates all tables, the reusable RLS membership functions,
   triggers, and RLS policies.

3. **Configure auth.** Authentication → Providers → Email is enabled by default.
   For fast local testing you can turn **off** "Confirm email" (Authentication →
   Sign In / Providers) so sign-up returns a session immediately.

4. **Set environment variables.** Copy `.env.example` to `.env.local` and fill
   in the values from Supabase → Project Settings → API:

   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   SUPABASE_SERVICE_ROLE_KEY=…      # server only
   ANTHROPIC_API_KEY=               # optional until later phases
   ```

5. **Run it.**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000. You'll land on `/sign-in`. Create an account →
   you'll be prompted to create your first farm → then the dashboard.

## Scripts

| Command                | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                  |
| `npm run build`        | Production build                        |
| `npm run lint`         | ESLint                                  |
| `npm run format`       | Prettier (incl. import + class sorting) |
| `npm run format:check` | Check formatting without writing        |
| `npm run db:types`     | Regenerate DB types from the live schema |

## Database types

`src/lib/types/database.gen.ts` is generated from the live Supabase schema;
`src/lib/types/database.ts` is a thin alias layer (`Profile`, `Farm`, enums…)
that the app imports — so regenerating can never break import sites.

Regenerate after any schema/migration change:

```bash
export SUPABASE_ACCESS_TOKEN=…   # https://supabase.com/dashboard/account/tokens
npm run db:types
```

(The project ref `ahfmyscxdncdubdpcvtu` is baked into the script. Until the token
is supplied, the committed `.gen.ts` is a hand-authored stand-in that mirrors the
migrations.)

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework auto-detected as
   Next.js).
2. Add the four env vars above in Vercel → Project → Settings → Environment
   Variables (Production + Preview).
3. In Supabase → Authentication → URL Configuration, add your Vercel domain to
   the site/redirect URLs.
4. Deploy.

## Project layout

```
src/
  app/
    (app)/            # protected shell: layout + dashboard + placeholder pages
    (auth)/           # sign-in / sign-up (branded auth layout)
    onboarding/       # create-first-farm flow
    page.tsx          # "/" → redirects by auth state
    globals.css       # Furrow design tokens + shadcn theme mapping
  components/
    brand/            # logo + topographic contour motif
    common/           # Stat, Delta, SignalBadge, PageHeader, ComingSoon
    dashboard/        # hero price card, weather, fields, news, price chart
    shell/            # sidebar, top bar, farm switcher, user menu
    ui/               # shadcn/ui primitives
  lib/
    supabase/         # browser + server clients, session proxy helper
    types/database.ts # hand-authored DB types
  proxy.ts            # Next 16 proxy (auth refresh + route protection)
supabase/migrations/  # SQL schema + RLS
```
