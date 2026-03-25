# TwitchZap — Debugging Guide

## Common Issues & Solutions

### 1. Twitch Embed Not Loading

**Symptoms:** Blank player area, iframe error, or "Content blocked" message.

**Causes & Fixes:**
- **Missing `parent` parameter**: The Twitch embed requires `parent={your-domain}`. For local dev, use `parent=localhost`. For production, use your Vercel domain.
- **HTTPS required in production**: Twitch embeds only work over HTTPS. Vercel handles this automatically, but custom domains need SSL.
- **Ad blockers**: Many ad blockers block Twitch embeds. Test in incognito without extensions.
- **CSP headers**: If you've set Content-Security-Policy headers, ensure `frame-src https://player.twitch.tv` is allowed.

```typescript
// Correct embed URL
const embedUrl = `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
```

### 2. Twitch OAuth Login Failing

**Symptoms:** Redirect loop, 401 errors, or "Invalid client" message.

**Causes & Fixes:**
- **Redirect URI mismatch**: The callback URL in your Twitch app settings must exactly match Supabase's redirect URL. Check Supabase Dashboard → Auth → Providers → Twitch.
- **Missing scopes**: Ensure `user:read:email` scope is requested.
- **Client ID/Secret mismatch**: Verify environment variables match the Twitch Developer Console.
- **Supabase auth not configured**: Enable Twitch provider in Supabase Dashboard.

### 3. Realtime Subscriptions Not Working

**Symptoms:** Votes don't update live, stream transitions are delayed, viewer count is stale.

**Causes & Fixes:**
- **Realtime not enabled**: In Supabase Dashboard → Database → Replication, ensure the relevant tables have realtime enabled.
- **RLS blocking subscriptions**: Realtime respects RLS. If a user can't SELECT a row, they won't receive updates. Check your policies.
- **Channel not subscribed**: Verify the subscription is actually active:
```typescript
const channel = supabase.channel('my-channel')
  .subscribe((status) => {
    console.log('Subscription status:', status); // Should be 'SUBSCRIBED'
  });
```
- **Payload too large**: Supabase Realtime has a ~1MB payload limit. If broadcasting large objects, slim them down.

### 4. Cron Job Not Rotating Streams

**Symptoms:** Same stream plays indefinitely, queue doesn't advance.

**Causes & Fixes:**
- **Cron not configured**: Check `vercel.json` has the cron entry. Verify in Vercel Dashboard → Cron Jobs.
- **Auth failing**: The cron endpoint must validate `CRON_SECRET`. Check the env var is set in Vercel.
- **Logic error in rotation**: Add logging to the cron handler:
```typescript
console.log('Cron fired:', new Date().toISOString());
console.log('Current broadcast:', currentBroadcast);
console.log('Queue length:', queueLength);
```
- **Supabase service role key**: The cron runs server-side and needs `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS.
- **Empty queue**: If no streams are queued, the cron should handle this gracefully (not crash).

### 5. Voting Results Incorrect

**Symptoms:** Skip/stay doesn't trigger despite clear majority, or triggers incorrectly.

**Causes & Fixes:**
- **Quorum not checked**: Verify the 5-vote minimum is enforced before calculating percentages.
- **Wrong extension_round**: Votes are scoped per round. If the round isn't incremented on extension, old votes count again.
- **Race condition**: Multiple clients voting simultaneously. The DB unique constraint `(broadcast_id, user_id, extension_round)` prevents duplicates, but handle the conflict gracefully:
```typescript
const { error } = await supabase.from('votes').insert(vote);
if (error?.code === '23505') {
  // Unique constraint violation — user already voted
  return Response.json({ error: 'Already voted' }, { status: 409 });
}
```
- **Percentage calculation**: Ensure you're dividing by total votes, not total viewers:
```
skip_percentage = skip_votes / total_votes  (NOT skip_votes / viewer_count)
```

### 6. Zap Points Not Awarding

**Symptoms:** User watches/votes but points don't increase.

**Causes & Fixes:**
- **Watch time tracking**: Points require active viewer sessions. Check the heartbeat mechanism is working (client sends ping every 60 seconds).
- **Transaction not committed**: Ensure point awards happen in a transaction that also updates `users.zap_points`:
```sql
BEGIN;
  INSERT INTO point_transactions (...) VALUES (...);
  UPDATE users SET zap_points = zap_points + $amount WHERE id = $user_id;
COMMIT;
```
- **Duplicate prevention**: Watch time points should be idempotent — if the cron fires twice in a minute, don't double-award.

### 7. Cooldown Not Calculating Correctly

**Symptoms:** Stream shows wrong cooldown time, or is available too early/late.

**Causes & Fixes:**
- **Base vs. effective cooldown**: The `streams.cooldown_hours` field is the effective cooldown (after reductions). Don't compare against the 20-hour base.
- **Timezone issues**: Always use UTC for cooldown calculations. `TIMESTAMPTZ` in PostgreSQL stores UTC.
```sql
-- Correct: compare in UTC
WHERE last_broadcast_at IS NULL 
   OR NOW() > last_broadcast_at + (cooldown_hours || ' hours')::interval
```
- **Boost not applied**: Check `cooldown_boosts` table for pending reductions that haven't been applied to `streams.cooldown_hours`.

### 8. Stream Shows as "Live" But Is Actually Offline

**Symptoms:** TwitchZap plays a stream that shows the offline screen.

**Causes & Fixes:**

**Layer 1 failure (queue didn't catch it):**
- **Queue polling interval too wide**: The queue guardian polls the top 5 every 5 minutes. If a stream goes offline and immediately becomes #1 between polls, it can slip through. The pre-play verify is the safety net — check it's working.
- **Pre-play verify skipped**: If the cron rotation logic doesn't call `getNextLiveStream()` and instead just pops the queue blindly, offline streams will play. Always cascade through the queue checking liveness.

**Layer 2 failure (watchdog didn't detect):**
- **Embed events not firing**: The Twitch Embed `OFFLINE` event requires the embed to be loaded correctly with the right `parent` parameter. Check browser console for Twitch embed errors.
- **Viewer consensus threshold too high**: If only 1-2 viewers are connected, the standard threshold of 3 reports is unreachable. The low-viewer-count special case must be implemented:
  - 1 viewer → trust immediately
  - 2 viewers → require both
  - 3+ viewers → require 3
- **Supabase Realtime liveness channel not subscribed**: Verify the `liveness` channel is active and client reports are reaching the server.
- **Stale Twitch App Access Token**: If the token expired, Helix API calls fail silently (return 401) and the 30-second poll sees no data but doesn't know if the stream is offline or the API call failed. Add explicit 401 handling with token refresh.

**Layer 3 failure (failover didn't trigger):**
- **Grace period timer not running**: If `offline_detected_at` is set but `grace_period_expires_at` isn't, the failover logic isn't checking the timer.
- **Cron isn't running frequently enough**: The cron must run every 30 seconds during an active broadcast for liveness checks. If it's still at 60 seconds, reduce it.

**Debugging liveness in production:**
```sql
-- Check if current broadcast has liveness issues
SELECT 
  id, status, 
  offline_detected_at, 
  offline_detection_method,
  grace_period_expires_at,
  recovery_count,
  offline_reporters
FROM broadcasts 
WHERE status = 'live' 
ORDER BY started_at DESC LIMIT 1;

-- Check how many broadcasts ended due to offline
SELECT COUNT(*), offline_detection_method 
FROM broadcasts 
WHERE status = 'ended_offline' 
GROUP BY offline_detection_method;

-- Check queue removals due to offline
SELECT q.id, s.twitch_username, q.status, q.completed_at
FROM queue q JOIN streams s ON q.stream_id = s.id
WHERE q.status = 'cancelled'
ORDER BY q.completed_at DESC LIMIT 10;
```

### 9. Layout / Styling Issues

**Symptoms:** Components don't match the design system, colors are off, fonts wrong.

**Causes & Fixes:**
- **Tailwind config**: Verify `tailwind.config.ts` has all the custom colors from DESIGN.md (surface, surface-container-low, primary, etc.)
- **Google Fonts not loading**: Check the `<link>` tags for Plus Jakarta Sans and Inter are in the layout.
- **Dark mode**: The design system is dark-only. Ensure `darkMode: "class"` is set and the `<html>` tag has `class="dark"`.
- **No-line rule**: If you see 1px borders between sections, you're violating the design system. Use tonal shifts instead.

### 10. Database Migration Failures

**Symptoms:** Drizzle push/migrate fails, tables missing, or schema out of sync.

**Causes & Fixes:**
- **Connection string**: Verify `DATABASE_URL` in your environment is correct (get from Supabase Settings → Database → Connection string).
- **Existing tables conflict**: If tables exist from manual creation, Drizzle may conflict. Use `drizzle-kit push` for development and `drizzle-kit migrate` for production.
- **RLS blocking service role**: Service role should bypass RLS, but double-check the key is `SUPABASE_SERVICE_ROLE_KEY`, not the anon key.

## Logging Strategy

### Development
```typescript
// Use structured logging
console.log('[CRON]', 'Rotation check:', { currentBroadcast, queueLength, timestamp });
console.log('[VOTE]', 'Vote cast:', { userId, broadcastId, vote, round });
console.log('[TWITCH]', 'Stream check:', { channel, isLive, viewerCount });
```

### Production
- Use Vercel's built-in logging (Vercel Dashboard → Logs)
- Critical errors should be tracked (consider Sentry for production)
- Log all cron executions with outcomes
- Log all vote tallying results

## Health Checks

### Quick Sanity Check Sequence
1. Can you log in with Twitch? → Auth working
2. Does the stream embed load? → Twitch integration working
3. Submit a stream — does it appear in queue? → Submission + queue working
4. Wait for rotation — does the stream play? → Cron + rotation working
5. Vote on a stream — does the count update live? → Voting + Realtime working
6. Check your profile — do points show up? → Gamification working

### Database Health
```sql
-- Check table counts
SELECT 'users' as t, count(*) FROM users
UNION ALL SELECT 'streams', count(*) FROM streams
UNION ALL SELECT 'queue', count(*) FROM queue
UNION ALL SELECT 'broadcasts', count(*) FROM broadcasts
UNION ALL SELECT 'votes', count(*) FROM votes;

-- Check current broadcast
SELECT * FROM broadcasts WHERE status = 'live' ORDER BY started_at DESC LIMIT 1;

-- Check queue
SELECT q.position, s.twitch_username, q.status 
FROM queue q JOIN streams s ON q.stream_id = s.id 
WHERE q.status = 'waiting' ORDER BY q.position;
```
