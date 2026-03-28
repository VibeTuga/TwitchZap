-- Enable Row Level Security on all tables and create access policies
-- This prevents unauthorized data access through the Supabase anon key / PostgREST

-- ============================================================
-- 1. USERS — publicly readable, users can only update themselves
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 2. STREAMS — publicly readable, managed by service role
-- ============================================================
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Streams are publicly readable"
  ON streams FOR SELECT
  USING (true);

-- ============================================================
-- 3. QUEUE — publicly readable, authenticated users can submit
-- ============================================================
ALTER TABLE queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Queue is publicly readable"
  ON queue FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can submit"
  ON queue FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- ============================================================
-- 4. BROADCASTS — read-only for all, managed by service role
-- ============================================================
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Broadcasts are publicly readable"
  ON broadcasts FOR SELECT
  USING (true);

-- ============================================================
-- 5. VOTES — publicly readable, authenticated users insert own
-- ============================================================
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes are publicly readable"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. POINT_TRANSACTIONS — users can only see their own
-- ============================================================
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
  ON point_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. BADGES — publicly readable (predefined data)
-- ============================================================
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are publicly readable"
  ON badges FOR SELECT
  USING (true);

-- ============================================================
-- 8. USER_BADGES — publicly readable (show off achievements)
-- ============================================================
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User badges are publicly readable"
  ON user_badges FOR SELECT
  USING (true);

-- ============================================================
-- 9. VIEWER_SESSIONS — users can only see their own
-- ============================================================
ALTER TABLE viewer_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own sessions"
  ON viewer_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 10. COOLDOWN_BOOSTS — publicly readable, authenticated users insert own
-- ============================================================
ALTER TABLE cooldown_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cooldown boosts are publicly readable"
  ON cooldown_boosts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can boost"
  ON cooldown_boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
