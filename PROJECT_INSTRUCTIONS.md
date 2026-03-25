# TwitchZap — Project Instructions

## Overview

TwitchZap is a community-powered stream discovery platform. It plays one Twitch stream at a time in 15-minute spotlight windows. The audience votes to skip or extend each stream. Anyone can submit a stream, but each can only air once every 20 hours. Gamification (Zap Points, badges, leaderboards) rewards active community participation.

## Build Rules

1. **Check GitHub tracker first** — Every session starts by reviewing the project board
2. **Follow the feedback loop** — Discuss → Build → Deploy → Check → Troubleshoot
3. **Update tracker at session end** — Document progress and next priorities
4. **Test before marking complete** — Verify functionality works before closing issues
5. **Follow the design system** — All UI must match DESIGN.md ("The Neon Pulse")
6. **No money features in v1** — Despite design mockups showing marketplace/payments, skip all monetization

## Current Phase

Phase 1: Foundation

Current priorities:
- Project initialization (Next.js, Tailwind, shadcn/ui)
- Database setup (Supabase + Drizzle)
- Twitch OAuth authentication
- Global layout (Sidebar, TopBar)
- Basic stream embed
- First deployment to Vercel

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript
- **Styling:** Tailwind CSS (with Neon Pulse design tokens)
- **Components:** shadcn/ui (heavily themed)
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle
- **Auth:** Supabase Auth with Twitch OAuth
- **Real-time:** Supabase Realtime
- **Hosting:** Vercel
- **Stream Embed:** Twitch Embed API
- **External API:** Twitch Helix API
- **Cron:** Vercel Cron

## Key Files

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | What, who, why — the full vision |
| `TECHNICAL_ARCHITECTURE.md` | System design, data flows, folder structure |
| `DATABASE_SCHEMA.md` | Complete schema with SQL, RLS policies |
| `API_INTEGRATIONS.md` | Twitch API, Supabase Realtime, cron setup |
| `UI_SPECIFICATIONS.md` | Page layouts, components, interactions |
| `DESIGN.md` | "Neon Pulse" design system — colors, typography, components |
| `BUILD_PHASES.md` | 4-phase roadmap with all GitHub issues |
| `DEBUGGING_GUIDE.md` | Common issues and troubleshooting |

## Session Start Checklist

- [ ] Reviewed project board for current issues
- [ ] Checked recent commits for last changes
- [ ] Reviewed "In Progress" issues for current work
- [ ] Verified deployment status on Vercel

## Session End Checklist

- [ ] Updated issue statuses on project board
- [ ] Documented decisions made during session
- [ ] Noted any blockers encountered
- [ ] Created issues for next priorities

## Core Mechanics Reference

### Broadcast Rotation
- 15-minute spotlight per stream
- Last 5 minutes = voting window
- Maximum 3 extensions (+10 min each, so 45 min max total)
- Streams verified as live before playing
- Automatic advance when time expires or skip vote passes

### Voting Thresholds
- **Quorum:** Minimum 5 voters required for any action
- **Skip:** ≥66% of votes must be "skip"
- **Stay:** >50% of votes must be "stay"
- **No quorum:** Stream completes its full time naturally

### Cooldown System
- **Base:** 20 hours between broadcasts
- **Zap Points boost:** 100⚡ → -2 hours
- **Extension streak (2+):** -25% of base cooldown
- **Max extension (3):** -50% of base cooldown
- **Minimum cooldown:** 4 hours (cannot reduce below this)

### Zap Points Economy
| Action | Points |
|--------|--------|
| Watching | 1⚡/minute |
| Voting | 5⚡/vote |
| Submitting (when stream plays) | 10⚡ |
| Submission extended | 20⚡ |
| Submission max extended (3x) | 50⚡ |
| Cooldown boost (spend) | -100⚡ |
| Queue priority (spend) | -200⚡ |

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Twitch
TWITCH_CLIENT_ID=your-client-id
TWITCH_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_TWITCH_CLIENT_ID=your-client-id

# Vercel Cron
CRON_SECRET=a-random-secret-string

# App
NEXT_PUBLIC_APP_URL=https://twitchzap.com (or localhost:3000 for dev)
```

## Deployment

1. Push to `main` branch → Vercel auto-deploys
2. Environment variables must be set in Vercel Dashboard → Settings → Environment Variables
3. Cron job configured in `vercel.json`
4. Supabase project must be on a plan that supports Realtime (free tier works for MVP)

## Common Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npx drizzle-kit push          # Push schema to Supabase (dev)
npx drizzle-kit migrate       # Run migrations (production)
npx drizzle-kit studio        # Open Drizzle Studio (DB browser)

# Testing
npm run lint                   # ESLint
npm run type-check            # TypeScript check

# Deployment
git push origin main          # Auto-deploys to Vercel
vercel --prod                 # Manual production deploy
```
