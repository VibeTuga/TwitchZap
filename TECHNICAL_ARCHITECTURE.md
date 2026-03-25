# TwitchZap — Technical Architecture

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) | SSR for SEO, real-time capabilities, React ecosystem |
| Language | TypeScript | Type safety across the full stack |
| Styling | Tailwind CSS | Matches existing "Neon Pulse" design system tokens |
| Components | shadcn/ui (customized) | Accessible primitives, heavily themed to match DESIGN.md |
| Database | Supabase (PostgreSQL) | Real-time subscriptions for live voting, built-in auth |
| ORM | Drizzle | Type-safe queries, lightweight, excellent DX |
| Auth | Supabase Auth (Twitch OAuth) | Native Twitch login — users already have accounts |
| Real-time | Supabase Realtime | WebSocket channels for synchronized viewing & voting |
| Hosting | Vercel | Zero-config Next.js deployment, edge functions |
| Stream Embed | Twitch Embed API | Official iframe embed for live streams |
| Cron/Jobs | Vercel Cron + Supabase Edge Functions | Queue rotation, cooldown management |
| API | Twitch Helix API | Stream metadata, channel info, live status verification |

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  (Browser — Next.js App)                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Live View│  │Discovery │  │ Queue    │  │ Profile  │   │
│  │ + Vote   │  │ Schedule │  │ Submit   │  │ Points   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └──────────────┴──────────────┴──────────────┘         │
└───────────────────────────┬─────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │  Next.js    │
                     │  API Routes │
                     │  (Vercel)   │
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────┴─────┐ ┌────┴────┐ ┌──────┴──────┐
        │ Supabase  │ │ Twitch  │ │ Vercel Cron │
        │ Database  │ │ Helix   │ │ (Rotation)  │
        │ + Realtime│ │ API     │ │             │
        └───────────┘ └─────────┘ └─────────────┘
```

## Core Data Flows

### 1. Stream Queue Rotation (The Heartbeat)

This is the central mechanism — a cron job that runs every minute to manage the broadcast schedule:

```
Every 60 seconds:
  1. Check: Is the current broadcast window expired?
  2. If YES:
     a. Mark current broadcast as "completed"
     b. Award Zap Points to viewers and voters
     c. Calculate engagement metrics
     d. Apply cooldown to the stream (20 hours default, minus reductions)
     e. Pull next stream from queue (ordered by submission time, FIFO)
     f. Verify stream is actually live via Twitch Helix API
        - If not live, skip to next in queue, mark as "skipped_offline"
     g. Set new broadcast: start_time = now, end_time = now + 15 min
     h. Broadcast "new_stream" event via Supabase Realtime
  3. If NO:
     a. Check if voting resulted in early skip → apply skip
     b. Check if voting resulted in extension → extend end_time by 10 min
```

### 2. Voting Flow

```
User clicks SKIP or STAY:
  1. Client → POST /api/votes { broadcast_id, vote: "skip" | "stay" }
  2. Server validates:
     - User is authenticated
     - Broadcast is in voting window (last 5 min)
     - User hasn't already voted on this broadcast
  3. Insert vote into database
  4. Supabase Realtime broadcasts updated vote counts to all clients
  5. At voting window close (or continuously):
     - Count total votes
     - If total votes < QUORUM (5): no action, stream completes normally
     - If skip votes ≥ 66% of total: trigger early end
     - If stay votes > 50% of total: extend by 10 minutes
     - If neither threshold met: stream completes normally
```

### 3. Stream Submission Flow

```
User submits a Twitch channel URL or username:
  1. Client → POST /api/submissions { twitch_channel }
  2. Server validates:
     - User is authenticated
     - Channel exists (Twitch Helix API lookup)
     - Channel is not in cooldown (last broadcast was ≥ 20 hours ago, minus reductions)
     - Channel is not already in the queue
  3. Insert into queue with position = max(position) + 1
  4. Return queue position to user
  5. Broadcast "queue_updated" event via Realtime
```

### 4. Stream Liveness Detection (Three-Layer System)

The most critical reliability feature. Dead air kills the product. This system uses three layers so that each catches what the previous one misses.

#### Layer 1: Queue Guardian (Before a Stream Plays)

**Submit-time check:** When a stream is submitted, the Twitch Helix API is called immediately. If the stream isn't live, the submission is rejected with "This stream isn't live right now."

**Queue polling (top 5, every 5 minutes):** A background task polls the next 5 streams in the queue via Helix API every 5 minutes. If any are offline:
- Remove them from the queue
- Notify the submitter: "The stream you submitted went offline and was removed"
- Award no penalty to the submitter (offline removal is free)

```
Every 5 minutes:
  1. SELECT top 5 from queue WHERE status = 'waiting' ORDER BY position
  2. For each: GET /helix/streams?user_login={username}
  3. If data is empty (offline):
     a. UPDATE queue SET status = 'cancelled' WHERE id = entry_id
     b. Send notification to submitter via Realtime
     c. Log removal reason: "offline_while_queued"
```

**Pre-play verify (final gate):** Right before the cron starts a new broadcast, it does one last live check. If offline, it skips to the next stream in queue and checks that one too. This cascades until a live stream is found or the queue is empty.

```
function getNextLiveStream(queue):
  for entry in queue:
    stream = GET /helix/streams?user_login={entry.username}
    if stream.data.length > 0:
      return entry  // This one is live, play it
    else:
      markAsSkipped(entry, reason: "offline_at_rotation")
      notifySubmitter(entry)
  return null  // Queue exhausted, show "no streams" state
```

#### Layer 2: Broadcast Watchdog (During Playback)

Three independent detection methods run simultaneously:

**Server-side Helix API poll (every 30 seconds):**
The cron checks the currently playing stream's status every 30 seconds. If the API returns empty data, it flags the stream as "potentially offline" and starts the grace period. Note: Twitch's API can lag 1-3 minutes behind reality, which is why this isn't the only layer.

```
Every 30 seconds (via cron):
  1. GET /helix/streams?user_login={current_stream.username}
  2. If data is empty AND grace_period_not_started:
     a. Set broadcast.offline_detected_at = NOW()
     b. Broadcast "stream_reconnecting" event to all clients
     c. Start 30-second grace period
  3. If data is NOT empty AND grace_period_active:
     a. Clear offline_detected_at
     b. Broadcast "stream_recovered" event
     c. Cancel grace period
```

**Client-side Twitch Embed event listener (fastest, ~5 seconds):**
The Twitch interactive embed fires JavaScript events when a stream goes offline. This is the fastest detection method — no API delay.

```typescript
// In StreamPlayer.tsx
const player = new Twitch.Player(elementId, { channel, parent: [hostname] });

player.addEventListener(Twitch.Player.OFFLINE, () => {
  // Report to server — this client detected the stream went offline
  supabase.channel('liveness').send({
    type: 'broadcast',
    event: 'client_offline_report',
    payload: {
      broadcast_id: currentBroadcast.id,
      user_id: userId,
      timestamp: Date.now()
    }
  });
});

player.addEventListener(Twitch.Player.ONLINE, () => {
  // Stream came back — report recovery
  supabase.channel('liveness').send({
    type: 'broadcast',
    event: 'client_online_report',
    payload: { broadcast_id: currentBroadcast.id, user_id: userId }
  });
});
```

**Viewer consensus (anti-false-positive):**
A single client reporting "offline" could be their own network issue, not the stream dying. The server requires **3+ unique clients** to report offline within a 30-second window before treating it as confirmed.

```
On receiving "client_offline_report":
  1. Store { user_id, timestamp } in a time-windowed set (30s TTL)
  2. Count unique reporters in the current window
  3. If count >= 3 AND grace_period_not_started:
     a. Start grace period (same as API detection)
     b. Broadcast "stream_reconnecting" to all clients
  4. If count >= 3 AND only 1 total viewer connected:
     a. Trust the single report (can't get consensus of 3 with 1 viewer)
     b. Start grace period immediately
```

**Special case — low viewer count:**
If only 1-2 viewers are connected, we can't wait for 3 reports. In this case:
- 1 viewer: trust their report immediately
- 2 viewers: require both to report before triggering
- 3+ viewers: require 3 reports (standard consensus)

#### Layer 3: Graceful Failover

**30-second grace period:**
Streamers sometimes drop for 10-20 seconds (ISP hiccup, OBS crash restart). When offline is detected:

```
1. Show "Stream reconnecting..." overlay on all clients
2. Display a 30-second countdown (tertiary cyan, per design system)
3. Keep polling Twitch API every 10 seconds during grace period
4. Listen for client "online_report" events

If stream recovers within 30 seconds:
  → Remove overlay, resume normally
  → Log event as "brief_dropout" (for analytics)
  → No penalty, no cooldown change

If grace period expires:
  → Mark broadcast as "ended_offline"
  → Immediately rotate to next stream (with pre-play verify)
  → Award partial watch-time points to viewers
  → Reduce cooldown to 50% (not the streamer's fault)
  → Notify viewers: "Stream went offline — loading next..."
```

**Cascading queue check on failover:**
When a mid-broadcast offline triggers failover, the next-stream selection uses the same pre-play verify cascade — it won't blindly load another potentially-offline stream.

#### Detection Timing Summary

| Scenario | Detection Method | Time to Detect | Grace Period | Total Dead Air |
|----------|-----------------|----------------|--------------|----------------|
| Stream ends normally | Embed OFFLINE event | ~2-5 seconds | 30 seconds | 32-35 seconds |
| Sudden disconnect | Embed OFFLINE event | ~2-5 seconds | 30 seconds | 32-35 seconds |
| Gradual degradation | Viewer consensus | ~15-30 seconds | 30 seconds | 45-60 seconds |
| API detects first | Helix poll | ~30-90 seconds | 30 seconds | 60-120 seconds |
| Stream offline in queue | Queue polling | N/A (pre-play) | N/A | 0 seconds |

**Worst case total dead air: ~2 minutes.** Without this system, dead air could last up to 15 minutes (full broadcast duration until the next cron rotation).

#### Database Fields Supporting Liveness

Added to the `broadcasts` table:
```sql
offline_detected_at TIMESTAMPTZ,        -- When offline was first detected
offline_detection_method TEXT,           -- 'helix_api', 'embed_event', 'viewer_consensus'
grace_period_expires_at TIMESTAMPTZ,    -- When the 30s grace period ends
offline_reporters JSONB DEFAULT '[]',   -- Array of {user_id, timestamp} for consensus tracking
recovery_count INTEGER DEFAULT 0,       -- How many times the stream dropped and recovered
```

### 5. Real-time Synchronization

All connected clients must see the same stream at the same time. This is achieved through Supabase Realtime channels:

```
Channel: "broadcast"
Events:
  - "new_stream"           → All clients load the new Twitch embed
  - "voting_open"          → UI transitions to voting mode (last 5 min)
  - "vote_update"          → Live vote count updates
  - "stream_extended"      → Timer resets, voting closes temporarily
  - "stream_skipped"       → Early transition to next stream
  - "stream_ended"         → Natural end, transition to next
  - "stream_reconnecting"  → Offline detected, show reconnecting overlay + 30s countdown
  - "stream_recovered"     → Stream came back during grace period, remove overlay
  - "stream_offline_final" → Grace period expired, transitioning to next stream

Channel: "liveness"
Events (client → server):
  - "client_offline_report"  → A client's Twitch embed fired OFFLINE event
  - "client_online_report"   → A client's embed detected the stream came back

Channel: "queue"
Events:
  - "queue_updated"        → New submission added, queue reordered
  - "position_changed"     → User's submission moved in queue
  - "stream_removed"       → Stream removed from queue (went offline while waiting)
```

### 5. Zap Points Economy

```
Earning:
  - Watching: 1 ⚡ per minute of active viewing (max 15 per standard broadcast)
  - Voting: 5 ⚡ per vote cast
  - Submitting: 10 ⚡ when your submitted stream starts playing
  - Extension bonus: 20 ⚡ if a stream you submitted gets extended
  - Discovery bonus: 50 ⚡ if a stream you submitted gets 3 extensions (max)

Spending:
  - Cooldown Boost: 100 ⚡ → reduce a stream's cooldown by 2 hours
  - Queue Priority: 200 ⚡ → move your submission up 3 positions
  - (Future: cosmetic items, badges, profile customization)
```

## Key Technical Decisions

### Why Supabase Realtime Over Socket.io/Pusher?
- Already using Supabase for the database — one fewer service to manage
- Native PostgreSQL integration means real-time subscriptions on database changes
- Row-Level Security (RLS) for data isolation
- Free tier is generous enough for MVP

### Why Twitch Embed API Over Custom Player?
- Official support, no TOS violations
- Handles all stream quality, chat integration, etc.
- Reduces our liability and complexity
- Viewers can optionally open Twitch chat alongside the embed

### Why Vercel Cron Over Dedicated Job Server?
- Simple 1-minute interval is sufficient for queue rotation
- No need for complex job orchestration
- Scales with Vercel's infrastructure
- Can migrate to dedicated workers later if needed

### Handling "Is the Stream Still Live?"
Before broadcasting a stream, we verify it's live via Twitch Helix API. If it goes offline mid-broadcast:
1. Detect via periodic polling (every 60 seconds)
2. If offline, immediately trigger next stream in queue
3. Mark the broadcast as "ended_offline"
4. Reduce cooldown by 50% (not the streamer's fault)

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Twitch
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
NEXT_PUBLIC_TWITCH_CLIENT_ID=

# Vercel
CRON_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

## Folder Structure

```
twitchzap/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx              # Live view (main experience)
│   │   │   ├── schedule/page.tsx     # Upcoming queue
│   │   │   ├── submit/page.tsx       # Submit a stream
│   │   │   ├── leaderboard/page.tsx  # Community rankings
│   │   │   └── profile/page.tsx      # User profile + stats
│   │   ├── api/
│   │   │   ├── votes/route.ts
│   │   │   ├── submissions/route.ts
│   │   │   ├── broadcasts/route.ts
│   │   │   ├── cron/rotate/route.ts  # Cron endpoint
│   │   │   └── twitch/
│   │   │       ├── verify/route.ts
│   │   │       └── callback/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── stream/
│   │   │   ├── StreamPlayer.tsx       # Twitch embed wrapper
│   │   │   ├── VotingPanel.tsx        # Skip/Stay voting UI
│   │   │   ├── CountdownTimer.tsx     # Time remaining display
│   │   │   └── StreamInfo.tsx         # Current stream metadata
│   │   ├── queue/
│   │   │   ├── QueueList.tsx          # Upcoming streams
│   │   │   ├── SubmitForm.tsx         # Stream submission
│   │   │   └── QueuePosition.tsx      # User's position indicator
│   │   ├── gamification/
│   │   │   ├── ZapPoints.tsx          # Points display
│   │   │   ├── Leaderboard.tsx        # Rankings table
│   │   │   ├── BadgeDisplay.tsx       # User badges
│   │   │   └── ActivityFeed.tsx       # Recent community actions
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopNav.tsx
│   │   │   └── MobileNav.tsx
│   │   └── ui/                        # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── twitch/
│   │   │   ├── api.ts                 # Helix API wrapper
│   │   │   └── embed.ts              # Embed helpers
│   │   ├── voting.ts                  # Vote calculation logic
│   │   ├── queue.ts                   # Queue management
│   │   ├── points.ts                  # Zap Points calculations
│   │   └── cooldown.ts               # Cooldown reduction logic
│   ├── hooks/
│   │   ├── useBroadcast.ts           # Current broadcast state
│   │   ├── useVoting.ts              # Voting state + actions
│   │   ├── useQueue.ts               # Queue subscription
│   │   └── useZapPoints.ts           # User points state
│   └── types/
│       ├── broadcast.ts
│       ├── vote.ts
│       ├── queue.ts
│       └── user.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── public/
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
