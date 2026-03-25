# CLAUDE.md — TwitchZap

## What This Project Is

TwitchZap is a community-powered Twitch stream discovery platform. One stream plays at a time for 15 minutes. Users vote to skip or extend. Anyone can submit streams. Gamification (Zap Points, badges, leaderboards) drives engagement. No money features in v1.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS with custom "Neon Pulse" dark-mode design tokens
- shadcn/ui components (themed to match DESIGN.md)
- Supabase (PostgreSQL + Realtime + Auth)
- Drizzle ORM
- Twitch Embed API + Twitch Helix API
- Vercel (hosting + cron)

## Key Commands

```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run lint             # Lint check
npx drizzle-kit push    # Push DB schema (dev)
npx drizzle-kit migrate # Run migrations (prod)
```

## Architecture Quick Reference

The app has one core loop: **Queue → Play → Vote → Rotate**

1. Users submit Twitch channels to a FIFO queue
2. A Vercel Cron (every 60s) checks if the current 15-min window has expired
3. If expired, it pulls the next stream, verifies it's live via Twitch Helix API, and starts a new broadcast
4. During the last 5 minutes, voting opens (SKIP needs 66% with 5+ voters; STAY needs >50%)
5. Extensions add 10 min (max 3 extensions = 45 min total)
6. After airing, the stream enters a 20-hour cooldown (reducible via Zap Points and engagement bonuses)

All connected clients stay in sync via Supabase Realtime.

## Project Documentation

Read these files for detailed specifications:

| Priority  | File                        | What It Covers                                               |
| --------- | --------------------------- | ------------------------------------------------------------ |
| 🔴 High   | `DESIGN.md`                 | Visual design system — colors, typography, component styling |
| 🔴 High   | `DATABASE_SCHEMA.md`        | Full SQL schema, RLS policies, seed data                     |
| 🔴 High   | `TECHNICAL_ARCHITECTURE.md` | System design, data flows, folder structure, env vars        |
| 🟡 Medium | `UI_SPECIFICATIONS.md`      | Page layouts, component specs, interaction details           |
| 🟡 Medium | `API_INTEGRATIONS.md`       | Twitch API, Supabase Realtime, cron endpoints                |
| 🟡 Medium | `BUILD_PHASES.md`           | Issue-by-issue build roadmap (4 phases)                      |
| 🟢 Low    | `DEBUGGING_GUIDE.md`        | Troubleshooting common problems                              |
| 🟢 Low    | `PROJECT_INSTRUCTIONS.md`   | Session protocols, env var reference                         |

## Code Conventions

- Use `src/` directory structure as defined in TECHNICAL_ARCHITECTURE.md
- All components in PascalCase, all utilities in camelCase
- Database queries go through Drizzle, never raw SQL in API routes
- Real-time subscriptions use Supabase channels, not polling
- All API routes include error handling and input validation
- Follow the "No-Line Rule" from DESIGN.md — no 1px borders for sectioning

### Design References

- **`./docs/design/*.html`** — Pre-built HTML design references for key pages and components. Before implementing any page or component, check if a corresponding `.html` file exists in this directory and match its structure, layout, and visual style.
- **`./docs/design/screenshots/`** — Screenshots of the approved designs. Use these as the visual source of truth when the HTML files alone aren't sufficient to judge spacing, proportions, or overall feel.
- When building a new page or component: **(1)** check `./docs/design/` for an existing HTML reference, **(2)** cross-reference with screenshots in `./docs/design/screenshots/`, **(3)** consult `DESIGN.md` for tokens and rules, **(4)** only then start coding.
- Never deviate from the approved designs without explicit approval. If the design references conflict with DESIGN.md, the HTML references + screenshots take precedence as they represent the latest approved visuals.

## Critical Business Rules (Don't Get These Wrong)

1. **Voting quorum is 5** — fewer than 5 total votes = no action taken
2. **Skip requires 66% supermajority** — protects streamers from small groups of trolls
3. **Stay requires simple majority (>50%)** — extending is the positive/default action
4. **Max 3 extensions** per broadcast (45 minutes total ceiling)
5. **20-hour cooldown** between broadcasts of the same stream
6. **Minimum 4-hour cooldown** even with all reductions applied
7. **Stream must be live** on Twitch when it starts playing — verify via Helix API
8. **One vote per user per round** — no changing votes, no multi-voting

## Stream Liveness Detection (Critical Reliability Feature)

**This is the most important reliability system in the app. Dead air = lost users.**

Three layers of detection, each catching what the previous misses:

**Layer 1 — Queue Guardian (before a stream plays):**

- Submit-time: reject if not live
- Queue polling: check top 5 every 5 min, remove offline streams silently
- Pre-play verify: final Helix API check right before rotation; cascade through queue until a live stream is found

**Layer 2 — Broadcast Watchdog (during playback):**

- Server: Helix API poll every 30 seconds
- Client: Twitch Embed `OFFLINE`/`ONLINE` events (fastest, ~5 sec detection)
- Consensus: require 3+ clients to report offline (anti-false-positive)
  - Special case: 1 viewer → trust immediately; 2 viewers → require both

**Layer 3 — Graceful Failover:**

- 30-second grace period with "reconnecting..." overlay
- If recovered → resume, no penalty
- If expired → end broadcast, advance queue, reduce cooldown to 50%

**Key implementation details:**

- The `liveness` Supabase Realtime channel handles client→server offline/online reports
- Broadcasts table has `offline_detected_at`, `offline_detection_method`, `grace_period_expires_at`, `offline_reporters` (JSONB), `recovery_count` fields
- Queue entries can have status `cancelled` (removed while waiting due to offline)
- Broadcasts can have status `ended_offline` (died mid-broadcast after grace period)

## Environment Variables

Required in `.env.local` (dev) and Vercel (prod):

```
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
NEXT_PUBLIC_TWITCH_CLIENT_ID
CRON_SECRET
NEXT_PUBLIC_APP_URL
```
