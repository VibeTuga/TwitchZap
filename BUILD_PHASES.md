# TwitchZap — Build Phases

## Phase 1: Foundation (Days 1-3)

**Goal:** Working deployment with Twitch auth, database, and a basic stream embed.

### Issues

- [ ] **P1-01**: Initialize Next.js 16 project with TypeScript, Tailwind, shadcn/ui
- [ ] **P1-02**: Configure Tailwind with the "Neon Pulse" design system tokens (colors, fonts, border-radius from DESIGN.md)
- [ ] **P1-03**: Set up Supabase project — create database, enable Realtime, configure auth
- [ ] **P1-04**: Set up Drizzle ORM with Supabase connection and migration pipeline
- [ ] **P1-05**: Create all database tables and migrations (users, streams, queue, broadcasts, votes, point_transactions, badges, user_badges, viewer_sessions, cooldown_boosts)
- [ ] **P1-06**: Apply RLS policies to all tables
- [ ] **P1-07**: Seed badges table with initial badge definitions
- [ ] **P1-08**: Implement Twitch OAuth via Supabase Auth — login/logout/callback flow
- [ ] **P1-09**: Create user record on first login (sync Twitch profile data to users table)
- [ ] **P1-10**: Build global layout — Sidebar, TopBar, MobileNav (matching existing HTML mockups)
- [ ] **P1-11**: Embed a Twitch stream player (basic iframe wrapper component)
- [ ] **P1-12**: Deploy to Vercel, verify working auth + embed on production URL

**Completion Criteria:**
- User can log in with Twitch
- A hardcoded stream plays in the embed
- Layout matches the "Neon Pulse" design
- Database is created with all tables
- Deployed and accessible at a public URL

---

## Phase 2: Core Features (Days 4-9)

**Goal:** The full broadcast loop works — queue, rotation, voting, and real-time sync.

### Issues

- [ ] **P2-01**: Build Stream Submission page — input, Twitch API lookup, validation, queue insertion
- [ ] **P2-02**: Implement Twitch Helix API wrapper (get stream info, get user info, verify live status)
- [ ] **P2-03**: Build Queue/Schedule page — list upcoming streams, show "now playing," tab for recently aired
- [ ] **P2-04**: Implement the Broadcast Rotation cron job (Vercel Cron, 1-minute interval)
  - Check current broadcast expiry
  - Pull next from queue
  - Verify stream is live
  - Set new broadcast with timing
- [ ] **P2-05**: Build the Live View page — stream embed + controls overlay + stream info card
- [ ] **P2-06**: Implement Countdown Timer component (displays time remaining, changes state at voting window)
- [ ] **P2-07**: Build Voting Panel component — SKIP/STAY buttons, vote counts, quorum indicator
- [ ] **P2-08**: Implement voting API route — validate, insert vote, return updated counts
- [ ] **P2-09**: Implement vote tallying logic:
  - Quorum check (minimum 5 voters)
  - Skip threshold (≥66% of votes)
  - Stay threshold (>50% of votes)
  - No-quorum fallback (stream completes normally)
- [ ] **P2-10**: Implement stream extension logic — extend end_time by 10 min, reset voting window, max 3 extensions
- [ ] **P2-11**: Implement early skip logic — mark broadcast as skipped, transition to next stream
- [ ] **P2-12**: Set up Supabase Realtime subscriptions:
  - Broadcast changes (new stream, status updates)
  - Vote count updates (real-time totals)
  - Queue changes (new submissions)
- [ ] **P2-13**: Implement Presence tracking — active viewer count via Supabase Presence
- [ ] **P2-14**: Build "Up Next" section on Live View — show next 3 streams from queue
- [ ] **P2-15**: Implement offline detection — poll Twitch API during broadcast, handle stream going offline mid-broadcast
- [ ] **P2-16**: Implement client-side Twitch Embed event listeners (OFFLINE/ONLINE) for fast offline detection (~5 sec)
- [ ] **P2-17**: Implement viewer consensus system — require 3+ client reports for offline confirmation, with low-viewer special cases (1 viewer = trust immediately, 2 = require both)
- [ ] **P2-18**: Implement 30-second grace period — "reconnecting" overlay, countdown, auto-recovery if stream returns
- [ ] **P2-19**: Implement queue guardian — poll top 5 queued streams every 5 min via Helix API, auto-remove offline streams with submitter notification
- [ ] **P2-20**: Implement pre-play verify cascade — before starting any broadcast, verify live status and cascade through queue until a live stream is found
- [ ] **P2-21**: Build "reconnecting" overlay UI — glassmorphic overlay on stream player with 30-second countdown timer in tertiary cyan
- [ ] **P2-22**: Build Activity Feed component — real-time scrolling feed of votes, submissions, badges
- [ ] **P2-23**: Handle edge cases: empty queue (show "No streams queued" state), all queued streams offline, only one stream in queue, stream goes offline during voting window

**Completion Criteria:**
- Users can submit streams to the queue
- Streams play in 15-minute rotations automatically
- Voting works with quorum + threshold logic
- Extensions and skips function correctly
- All viewers see the same stream in real-time
- Viewer count is accurate
- Offline streams are handled gracefully

---

## Phase 3: Gamification & Cooldown System (Days 10-13)

**Goal:** Zap Points economy, badges, leaderboards, and cooldown mechanics are all functional.

### Issues

- [ ] **P3-01**: Implement Zap Points earning — watching (1/min), voting (5/vote), submitting (10), extension bonus (20), discovery bonus (50)
- [ ] **P3-02**: Build point transaction logging — all point changes recorded with reason and reference
- [ ] **P3-03**: Implement watch-time tracking — viewer_sessions table, heartbeat-based tracking, award points per minute
- [ ] **P3-04**: Build Zap Points display component — shown in TopBar and Profile
- [ ] **P3-05**: Implement 20-hour cooldown enforcement on stream submissions
- [ ] **P3-06**: Build cooldown reduction system:
  - Zap Points boost: spend 100⚡ for -2 hours
  - Extension streak: 2+ extensions → -25% next cooldown
  - Max extension: 3 extensions → -50% next cooldown
- [ ] **P3-07**: Build cooldown boost UI — button on Submit page and stream cards showing cooldown status
- [ ] **P3-08**: Implement badge awarding system — check thresholds after relevant actions, award badges, notify user
- [ ] **P3-09**: Build Badge Display component — grid of earned/unearned badges with progress indicators
- [ ] **P3-10**: Build Leaderboard page — rankings by points, submissions, votes with time period filters
- [ ] **P3-11**: Build Profile page — user stats, badge collection, submission history, vote history, point log
- [ ] **P3-12**: Implement queue priority boost — spend 200⚡ to move submission up 3 positions

**Completion Criteria:**
- Points are awarded correctly for all actions
- Cooldown system works (20h base, reductions apply)
- Badges are earned and displayed
- Leaderboard shows accurate rankings
- Profile shows comprehensive user stats
- Queue priority boosting works

---

## Phase 4: Polish & Delivery (Days 14-16)

**Goal:** Production-ready, polished, delightful experience.

### Issues

- [ ] **P4-01**: Add animations — vote button press, stream transitions, extension celebration, voting window opening
- [ ] **P4-02**: Add loading states to all async operations (skeleton screens, spinners)
- [ ] **P4-03**: Add error handling and error boundaries — API failures, Twitch embed failures, network issues
- [ ] **P4-04**: Add toast notifications — vote confirmed, points earned, badge unlocked, submission accepted
- [ ] **P4-05**: Mobile responsive polish — test all pages on small screens, fix layout issues
- [ ] **P4-06**: Add empty states — no streams in queue, no votes yet, no badges earned, new user onboarding
- [ ] **P4-07**: Performance optimization — lazy load non-critical components, optimize Supabase queries, add caching
- [ ] **P4-08**: SEO and metadata — Open Graph tags, page titles, descriptions
- [ ] **P4-09**: Add sound effects (optional toggle) — voting window open, extension win, stream transition
- [ ] **P4-10**: Security audit — validate all inputs, check RLS policies, rate-limit API routes, CSRF protection
- [ ] **P4-11**: Write README with setup instructions, environment variable documentation
- [ ] **P4-12**: Final testing — full user flow from login → submit → watch → vote → earn points → check leaderboard

**Completion Criteria:**
- All animations feel smooth and purposeful
- No console errors or unhandled exceptions
- Mobile experience is excellent
- All edge cases handled with appropriate UI states
- Performance is acceptable (LCP < 2.5s)
- Security checklist passed
- Documentation complete
