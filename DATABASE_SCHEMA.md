# TwitchZap — Database Schema

## Overview

All tables use Supabase (PostgreSQL) with Row-Level Security (RLS) enabled. The schema is managed via Drizzle ORM with migration files.

## Tables

### users

The core user table, linked to Supabase Auth. Created on first login via Twitch OAuth.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  twitch_id TEXT UNIQUE NOT NULL,
  twitch_username TEXT NOT NULL,
  twitch_display_name TEXT,
  twitch_avatar_url TEXT,
  zap_points INTEGER DEFAULT 0 NOT NULL,
  total_points_earned INTEGER DEFAULT 0 NOT NULL,
  streams_submitted INTEGER DEFAULT 0 NOT NULL,
  votes_cast INTEGER DEFAULT 0 NOT NULL,
  watch_minutes INTEGER DEFAULT 0 NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for leaderboard queries
CREATE INDEX idx_users_total_points ON users(total_points_earned DESC);
CREATE INDEX idx_users_twitch_id ON users(twitch_id);
```

### streams

Represents a Twitch channel that has been submitted. Stores metadata and cooldown state.

```sql
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitch_channel_id TEXT UNIQUE NOT NULL,
  twitch_username TEXT NOT NULL,
  twitch_display_name TEXT,
  twitch_avatar_url TEXT,
  category TEXT,                          -- Game/category from Twitch
  last_broadcast_at TIMESTAMPTZ,          -- When this stream was last featured
  cooldown_hours NUMERIC(5,2) DEFAULT 20 NOT NULL, -- Current cooldown (can be reduced)
  base_cooldown_hours NUMERIC(5,2) DEFAULT 20 NOT NULL,
  times_featured INTEGER DEFAULT 0 NOT NULL,
  times_extended INTEGER DEFAULT 0 NOT NULL,
  times_skipped INTEGER DEFAULT 0 NOT NULL,
  total_watch_minutes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_streams_twitch_channel ON streams(twitch_channel_id);
CREATE INDEX idx_streams_cooldown ON streams(last_broadcast_at);
```

### queue

The ordered list of streams waiting to be broadcast. FIFO by default, but position can be modified by spending Zap Points.

```sql
CREATE TABLE queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'completed', 'cancelled', 'skipped_offline')) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(stream_id, status) -- A stream can only be "waiting" once at a time
);

CREATE INDEX idx_queue_status_position ON queue(status, position);
CREATE INDEX idx_queue_submitted_by ON queue(submitted_by);
```

### broadcasts

A record of each time a stream was featured on TwitchZap. This is the central table for the live experience.

```sql
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_entry_id UUID REFERENCES queue(id) NOT NULL,
  stream_id UUID REFERENCES streams(id) NOT NULL,
  submitted_by UUID REFERENCES users(id),
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,         -- When the current window ends
  actual_end_at TIMESTAMPTZ,                     -- When it actually ended
  base_duration_minutes INTEGER DEFAULT 15 NOT NULL,
  
  -- Extensions
  extensions_count INTEGER DEFAULT 0 NOT NULL,   -- How many times extended (max 3)
  max_extensions INTEGER DEFAULT 3 NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'live' CHECK (status IN ('live', 'voting', 'extended', 'completed', 'skipped', 'ended_offline')) NOT NULL,
  
  -- Voting window
  voting_opens_at TIMESTAMPTZ,                   -- 5 min before scheduled_end_at
  voting_result TEXT CHECK (voting_result IN ('skip', 'stay', 'no_quorum', 'pending', NULL)),
  
  -- Metrics (denormalized for fast reads)
  total_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  skip_votes INTEGER DEFAULT 0,
  stay_votes INTEGER DEFAULT 0,
  
  -- Stream metadata snapshot (captured at start)
  stream_title TEXT,
  stream_category TEXT,
  stream_viewer_count INTEGER,                   -- Twitch viewer count at start
  
  -- Liveness detection
  offline_detected_at TIMESTAMPTZ,               -- When offline was first flagged
  offline_detection_method TEXT CHECK (offline_detection_method IN ('helix_api', 'embed_event', 'viewer_consensus', NULL)),
  grace_period_expires_at TIMESTAMPTZ,           -- When the 30s reconnection window ends
  offline_reporters JSONB DEFAULT '[]',          -- Array of {user_id, timestamp} for consensus
  recovery_count INTEGER DEFAULT 0 NOT NULL,     -- Times the stream dropped and recovered mid-broadcast
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_stream ON broadcasts(stream_id);
CREATE INDEX idx_broadcasts_started ON broadcasts(started_at DESC);
```

### votes

Individual user votes on broadcasts.

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('skip', 'stay')),
  extension_round INTEGER DEFAULT 0 NOT NULL,    -- Which round: 0 = initial, 1-3 = extensions
  voted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(broadcast_id, user_id, extension_round)  -- One vote per user per round
);

CREATE INDEX idx_votes_broadcast ON votes(broadcast_id);
CREATE INDEX idx_votes_user ON votes(user_id);
```

### point_transactions

Audit log of all Zap Point changes. Enables reconstruction of balances and debugging.

```sql
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,                       -- Positive = earn, negative = spend
  reason TEXT NOT NULL CHECK (reason IN (
    'watching',           -- 1pt per minute
    'voting',             -- 5pt per vote
    'submitting',         -- 10pt when submission starts playing
    'extension_bonus',    -- 20pt when your submission gets extended
    'discovery_bonus',    -- 50pt when your submission gets max extensions
    'cooldown_boost',     -- -100pt spent to reduce cooldown
    'queue_priority',     -- -200pt spent to move up queue
    'badge_reward',       -- Variable, awarded with badges
    'admin_adjustment'    -- Manual adjustment by admin
  )),
  reference_id UUID,                             -- Broadcast ID, queue ID, etc.
  balance_after INTEGER NOT NULL,                -- Running balance snapshot
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_points_user ON point_transactions(user_id, created_at DESC);
```

### badges

Predefined badges users can earn.

```sql
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,                            -- Emoji or icon identifier
  category TEXT NOT NULL CHECK (category IN ('discovery', 'engagement', 'milestone', 'special')),
  requirement_type TEXT NOT NULL,                 -- e.g., 'streams_submitted', 'votes_cast', 'extensions_earned'
  requirement_value INTEGER NOT NULL,             -- Threshold to earn
  points_reward INTEGER DEFAULT 0 NOT NULL,      -- Bonus points awarded
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed data
INSERT INTO badges (slug, name, description, icon, category, requirement_type, requirement_value, points_reward) VALUES
  ('first_submit', 'Trailblazer', 'Submitted your first stream to TwitchZap', '🔭', 'discovery', 'streams_submitted', 1, 25),
  ('submit_10', 'Talent Scout', 'Submitted 10 streams', '🎯', 'discovery', 'streams_submitted', 10, 100),
  ('submit_50', 'Casting Director', 'Submitted 50 streams', '🎬', 'discovery', 'streams_submitted', 50, 500),
  ('first_vote', 'Voice Heard', 'Cast your first vote', '🗳️', 'engagement', 'votes_cast', 1, 10),
  ('vote_100', 'Democracy Champion', 'Cast 100 votes', '⚖️', 'engagement', 'votes_cast', 100, 250),
  ('vote_500', 'Community Pillar', 'Cast 500 votes', '🏛️', 'engagement', 'votes_cast', 500, 1000),
  ('first_extension', 'Crowd Pleaser', 'A stream you submitted got extended', '🔥', 'discovery', 'extensions_earned', 1, 50),
  ('triple_extend', 'Kingmaker', 'A stream you submitted hit max extensions', '👑', 'discovery', 'extensions_earned_max', 1, 200),
  ('watch_60', 'Marathon Viewer', 'Watched 60 minutes of TwitchZap', '👀', 'milestone', 'watch_minutes', 60, 25),
  ('watch_600', 'Couch Potato', 'Watched 10 hours of TwitchZap', '🛋️', 'milestone', 'watch_minutes', 600, 250),
  ('points_1000', 'Zap Collector', 'Earned 1,000 total Zap Points', '⚡', 'milestone', 'total_points_earned', 1000, 0),
  ('points_10000', 'Lightning Rod', 'Earned 10,000 total Zap Points', '🌩️', 'milestone', 'total_points_earned', 10000, 0);
```

### user_badges

Junction table for badges earned by users.

```sql
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

### viewer_sessions

Tracks active viewers for a broadcast (for watch time points and viewer count).

```sql
CREATE TABLE viewer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_at TIMESTAMPTZ,
  watch_seconds INTEGER DEFAULT 0 NOT NULL,
  points_awarded INTEGER DEFAULT 0 NOT NULL,
  
  UNIQUE(broadcast_id, user_id)
);

CREATE INDEX idx_viewer_sessions_broadcast ON viewer_sessions(broadcast_id);
```

### cooldown_boosts

Records of cooldown reductions applied to streams.

```sql
CREATE TABLE cooldown_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN (
    'zap_points',       -- Spent 100 ⚡ for -2 hours
    'extension_streak', -- Stream got 2+ extensions: -25% cooldown
    'max_extension',    -- Stream got 3 extensions: -50% cooldown
    'community_follow'  -- Viewers followed the streamer: -1hr per threshold
  )),
  hours_reduced NUMERIC(5,2) NOT NULL,
  points_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cooldown_boosts_stream ON cooldown_boosts(stream_id);
```

## Row-Level Security Policies

```sql
-- Users can read all users but only update themselves
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Votes: users can read all votes but only insert their own
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are publicly readable" ON votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Queue: publicly readable, authenticated users can insert
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Queue is publicly readable" ON queue FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit" ON queue FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Broadcasts: read-only for all, managed by service role
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Broadcasts are publicly readable" ON broadcasts FOR SELECT USING (true);

-- Point transactions: users can only see their own
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON point_transactions FOR SELECT USING (auth.uid() = user_id);

-- Badges and user_badges: publicly readable
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are publicly readable" ON badges FOR SELECT USING (true);
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges are publicly readable" ON user_badges FOR SELECT USING (true);

-- Viewer sessions: users see their own
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON viewer_sessions FOR SELECT USING (auth.uid() = user_id);

-- Streams: publicly readable
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streams are publicly readable" ON streams FOR SELECT USING (true);
```

## Key Computed Values

### Cooldown Availability Check

A stream is available for queue submission when:

```sql
-- Stream is available if:
-- (last_broadcast_at IS NULL) — never been featured
-- OR (NOW() - last_broadcast_at) >= cooldown_hours * interval '1 hour'
-- Cooldown can be reduced from the base 20 hours via boosts

SELECT * FROM streams 
WHERE last_broadcast_at IS NULL 
   OR (NOW() - last_broadcast_at) >= (cooldown_hours * interval '1 hour');
```

### Voting Result Calculation

```sql
-- For a given broadcast + extension_round:
SELECT 
  COUNT(*) AS total_votes,
  COUNT(*) FILTER (WHERE vote = 'skip') AS skip_count,
  COUNT(*) FILTER (WHERE vote = 'stay') AS stay_count,
  CASE
    WHEN COUNT(*) < 5 THEN 'no_quorum'
    WHEN COUNT(*) FILTER (WHERE vote = 'skip')::float / COUNT(*) >= 0.66 THEN 'skip'
    WHEN COUNT(*) FILTER (WHERE vote = 'stay')::float / COUNT(*) > 0.50 THEN 'stay'
    ELSE 'no_action'
  END AS result
FROM votes
WHERE broadcast_id = $1 AND extension_round = $2;
```

## Migration Strategy

Migrations are managed via Drizzle Kit and stored in `supabase/migrations/`. Each migration is timestamped and idempotent.

```
supabase/migrations/
├── 0001_create_users.sql
├── 0002_create_streams.sql
├── 0003_create_queue.sql
├── 0004_create_broadcasts.sql
├── 0005_create_votes.sql
├── 0006_create_point_transactions.sql
├── 0007_create_badges.sql
├── 0008_create_user_badges.sql
├── 0009_create_viewer_sessions.sql
├── 0010_create_cooldown_boosts.sql
├── 0011_create_rls_policies.sql
└── 0012_seed_badges.sql
```
