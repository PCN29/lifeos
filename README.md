# Life OS

Deep work timer, gym progressive overload, VCE SAC tracker and ATAR estimator.
Syncs across every device you sign in on.

Stack: Next.js (Vercel) + Supabase (Postgres + auth).

---

## Setup — roughly 60–90 minutes first time

### 1. Supabase — database and login (~15 min)

1. Sign up at supabase.com, **New project**. Pick the Sydney region.
2. Save the database password somewhere. You won't need it often but you can't recover it.
3. Wait for the project to finish provisioning (~2 min).
4. **SQL Editor** → **New query** → paste all of `supabase/schema.sql` → **Run**.
   You should see "Success. No rows returned."
5. **Project Settings** → **API**. Copy two values:
   - Project URL
   - `anon` `public` key
6. **Authentication** → **Providers** → make sure **Email** is on.
   Turn **Confirm email** off while testing so links work instantly.

### 2. Local run (~15 min)

```bash
npm install
cp .env.example .env.local
```

Put your two Supabase values into `.env.local`, then:

```bash
npm run dev
```

Open http://localhost:3000, enter your email, click the link that arrives.
You should land on the app with your seeded data.

### 3. GitHub (~5 min)

```bash
git init
git add .
git commit -m "Life OS"
git branch -M main
git remote add origin https://github.com/PCN29/lifeos.git
git push -u origin main
```

Make the repo **private** — it's your personal data model.

### 4. Vercel — deploy (~15 min)

1. vercel.com → sign in with GitHub → **Add New Project** → pick the repo.
2. Framework auto-detects as Next.js. Don't change the build settings.
3. **Environment Variables** — add all three from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (optional, see below)
4. **Deploy**. You get a URL like `lifeos-xxxx.vercel.app`.
5. Back in Supabase → **Authentication** → **URL Configuration** → set
   **Site URL** to your Vercel URL, and add it under **Redirect URLs** too.
   Skip this and your login links will bounce to localhost.

### 5. Install on your phone (~2 min)

- **iPhone**: open the URL in Safari → Share → Add to Home Screen
- **Android**: open in Chrome → menu → Install app / Add to Home screen

Launches fullscreen with no browser bar. Behaves like a native app.

---

## The quick-add box

The "tell it what changed" input needs an **Anthropic API key**, which is
separate from Claude Pro and billed by usage. Load $5 at console.anthropic.com
and it'll last months at this volume.

Without a key everything else works fine — the box just returns an error.
The key lives server-side in `app/api/quickadd/route.js` and never reaches
the browser.

---

## Icons

`public/manifest.json` points at `icon-192.png` and `icon-512.png`, which
aren't included. Either drop two square PNGs in `public/`, or delete the
`icons` array from the manifest — everything still works, you just get a
default home-screen icon.

---

## Your data

One row in `lifeos_state`, one JSON blob, keyed to your user id.
Row Level Security means only you can read or write it — enforced by the
database, not by app code.

The Backup tab still exports and restores JSON. Use it monthly.

---

## Common problems

**Login link opens localhost from your phone** — Site URL in Supabase is
still localhost. Fix it in Authentication → URL Configuration.

**"Failed to fetch"** — env vars missing or misspelled in Vercel. They must
start with `NEXT_PUBLIC_` to reach the browser.

**Data doesn't load, no error** — the schema didn't run. Check the
`lifeos_state` table exists under Table Editor.

**Quick-add returns 501** — no `ANTHROPIC_API_KEY` set. Expected if you
haven't added one.
