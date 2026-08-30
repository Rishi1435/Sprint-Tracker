# Sprint Room — 21-Day Job Prep Tracker

A shared daily checklist for the 21-day plan (Aptitude, Reasoning, Verbal Ability, CS
Fundamentals, Java Core, DSA, LeetCode). Anyone who opens the deployed link can type their
name, get their own day-by-day checklist, and see everyone else's progress on the Squad page.

- Each person's "Day 1" is whatever day they first open the app and enter their name — so
  friends can join a few days late and still get a full 21-day run for themselves.
- No passwords. It's just a name. This is meant for a small trusted friend group, not the
  public internet — see the security note near the bottom.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — deploys natively on Vercel
- **Tailwind CSS v4** for styling
- **Supabase** (Postgres) for the shared database — every checkbox press is written there, so
  everyone always sees live progress, no server code required

## 1. Create the database (Supabase — free)

1. Go to [supabase.com](https://supabase.com), sign up, and create a new project (any name,
   any region close to you). Note the database password it gives you — you won't need it
   again for this app, but keep it somewhere safe.
2. Once the project is ready, open **SQL Editor** in the left sidebar → **New query**.
3. Paste in the entire contents of `supabase-schema.sql` (included in this project) and click
   **Run**. This creates the `users` and `progress` tables.
4. Go to **Settings → API**. You'll need two values from this page in the next step:
   - **Project URL**
   - **anon public** key (under "Project API keys")

## 2. Run it locally (optional, to try it before deploying)

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and paste in your Project URL + anon key
npm run dev
```

Open `http://localhost:3000`, enter a name, and try checking a few boxes.

## 3. Deploy to Vercel

1. Push this project to a GitHub repo (Vercel deploys from Git):
   ```bash
   git init
   git add .
   git commit -m "Sprint Room tracker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), sign in (GitHub login is easiest), click
   **Add New → Project**, and import the repo you just pushed.
3. Vercel auto-detects Next.js — leave the build settings as default.
4. Before clicking Deploy, open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon public key |
5. Click **Deploy**. In about a minute you'll get a live URL like
   `sprint-tracker-yourname.vercel.app` — send that to your friends.

Any time you push new commits to `main`, Vercel redeploys automatically.

## How it works

- `src/lib/plan.ts` — the entire 21-day plan (all 7 categories × 21 days) lives here as plain
  data. Edit this file if you want to change any day's topics — no database changes needed.
- `users` table — one row per person: name + the date they joined (their personal Day 1).
- `progress` table — one row per person per day, with a boolean column per task category.
- The **Squad** page reads every user's progress and ranks by overall completion %, so
  everyone can see who's ahead, who did today's tasks, and current streaks.

## Editing the plan

Open `src/lib/plan.ts` and edit the `rawTasks` array — each object is one day, in order, with
one string per category. The day numbering, week grouping, and weekday labels are all derived
automatically from array position, so you don't need to touch anything else.

## Security note

There's no login/password — anyone with the deployed link can create a "user" and, in
principle, tick or untick anyone else's boxes (the database's Row Level Security policies are
intentionally left open for simplicity). That's a reasonable tradeoff for a small group of
friends holding each other accountable. Don't reuse this schema for anything sensitive, and if
you want it locked down further, the natural next step is adding Supabase Auth (magic-link
email login) and tightening the RLS policies in `supabase-schema.sql` to check
`auth.uid() = user_id`.
