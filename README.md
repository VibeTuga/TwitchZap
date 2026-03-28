# TwitchZap

Community-powered Twitch stream discovery platform. One stream plays at a time for 15 minutes. Users vote to skip or extend. Anyone can submit streams. Gamification (Zap Points, badges, leaderboards) drives engagement.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL + Realtime + Auth)
- **ORM:** Drizzle ORM
- **APIs:** Twitch Embed API + Twitch Helix API
- **Hosting:** Vercel

## Getting Started

```bash
git clone <repo-url>
cd new-twitch-zap
npm install
cp .env.example .env.local   # or create .env.local manually
# Fill in all environment variables (see below)
npm run dev
```

## Environment Variables

Create a `.env.local` file with the following:

| Variable                        | Description                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Supabase PostgreSQL connection string (found in Supabase Dashboard → Settings → Database) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL (e.g. `https://xyz.supabase.co`)                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key (server-side only, never expose to client)                      |
| `TWITCH_CLIENT_ID`              | Twitch application Client ID (from Twitch Developer Console)                              |
| `TWITCH_CLIENT_SECRET`          | Twitch application Client Secret                                                          |
| `NEXT_PUBLIC_TWITCH_CLIENT_ID`  | Same Twitch Client ID, exposed to client for embed                                        |
| `CRON_SECRET`                   | Secret token to authenticate cron job requests                                            |
| `NEXT_PUBLIC_APP_URL`           | Public URL of the deployed app (e.g. `https://twitchzap.com`)                             |

## Supabase Twitch Auth Setup

TwitchZap uses Twitch as the sole authentication provider via Supabase Auth. **This must be configured or login will fail.**

### 1. Enable Twitch Provider in Supabase

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication → Providers → Twitch**
4. Toggle the provider **ON**
5. Enter your **Twitch Client ID** and **Twitch Client Secret**
6. Save

Without this step, login attempts will fail with:

```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

### 2. Configure Twitch OAuth Redirect URL

In the [Twitch Developer Console](https://dev.twitch.tv/console/apps):

1. Select your application
2. Add the following **OAuth Redirect URL**:
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```
3. Save

This redirect URL must match exactly — Twitch will reject auth requests if it doesn't.

## Cron Job Setup (cron-job.org)

TwitchZap's core loop depends on the rotation endpoint being called **every 60 seconds**. This is the heartbeat that drives the entire broadcast rotation — checking if the current stream's window has expired, pulling the next stream from the queue, verifying liveness, and starting new broadcasts.

**Vercel's Hobby plan only supports cron intervals of once per day**, which is insufficient. Use [cron-job.org](https://cron-job.org) (free tier) to call the endpoint every minute.

### Setup Steps

1. Create a free account at [cron-job.org](https://cron-job.org)
2. Create a new cron job with these settings:

| Setting      | Value                                           |
| ------------ | ----------------------------------------------- |
| **URL**      | `https://<your-domain>/api/cron/rotate`         |
| **Method**   | GET                                             |
| **Schedule** | Every 1 minute (`*/1 * * * *`)                  |
| **URL**      | `https://<your-domain>/api/cron/queue-guardian` |
| **Method**   | GET                                             |
| **Schedule** | Every 5 minutes (`*/5 * * * *`)                 |

3. Under **Advanced → Headers**, add a custom header:

| Header          | Value                             |
| --------------- | --------------------------------- |
| `Authorization` | `Bearer <your-CRON_SECRET-value>` |

The `CRON_SECRET` value must match the one set in your environment variables. This header authenticates the request so the endpoint only responds to authorized callers.

## Database Setup

```bash
# Development — push schema directly
npx drizzle-kit push

# Production — run migrations
npx drizzle-kit migrate
```

## Available Scripts

```bash
npm run dev       # Start local development server
npm run build     # Production build
npm run lint      # Run ESLint
```
