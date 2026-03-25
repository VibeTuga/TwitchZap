# TwitchZap — UI Specifications

## Page Map

```
/                    → Live View (main experience, default landing page)
/schedule            → Queue & Schedule (upcoming streams)
/submit              → Submit a Stream
/leaderboard         → Community Rankings
/profile             → User Profile & Stats
/login               → Twitch OAuth Login
```

## Global Layout

### Desktop (≥1024px)
- **Sidebar** (fixed left, 256px wide): Logo, navigation, user profile card, Go Live CTA
- **Top Bar** (sticky): Search, notifications, wallet (Zap Points balance), profile avatar
- **Main Content**: Fills remaining space, max-width 1400px, centered

### Mobile (<1024px)
- **Top Bar**: Logo (left), hamburger menu (right)
- **Bottom Tab Bar**: Live, Schedule, Submit, Leaderboard, Profile
- **Sidebar**: Slides in from left as overlay on hamburger tap

### Navigation Items
1. **Live Stream** (sensors icon) — The main viewing experience
2. **Schedule** (calendar_today icon) — Queue of upcoming streams
3. **Submit** (rocket_launch icon) — Submit a stream to the queue
4. **Leaderboard** (dashboard icon) — Community rankings
5. **Profile** (person icon) — User stats, badges, history

---

## Page 1: Live View (/) — The Core Experience

This is the heart of TwitchZap. One stream plays at a time, and the community watches together.

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR                                                 │
├─────────┬───────────────────────────────────────────────┤
│         │                                                │
│         │  ┌─────────────────────────────────────────┐  │
│         │  │                                         │  │
│         │  │          TWITCH STREAM EMBED             │  │
│  SIDE   │  │          (16:9 aspect ratio)             │  │
│  BAR    │  │                                         │  │
│         │  │  ┌──────────────────────────────────┐   │  │
│         │  │  │ GLASSMORPHIC CONTROLS OVERLAY    │   │  │
│         │  │  │ Timer | Stream Info | Voting      │   │  │
│         │  │  └──────────────────────────────────┘   │  │
│         │  └─────────────────────────────────────────┘  │
│         │                                                │
│         │  ┌──────────────┐  ┌────────────────────────┐ │
│         │  │ STREAM INFO  │  │ ACTIVITY FEED          │ │
│         │  │ Channel      │  │ Recent votes,          │ │
│         │  │ Category     │  │ submissions, etc.      │ │
│         │  │ Submitted by │  │                        │ │
│         │  └──────────────┘  └────────────────────────┘ │
│         │                                                │
│         │  ┌────────────────────────────────────────────┐│
│         │  │ UP NEXT (3 streams from queue)             ││
│         │  └────────────────────────────────────────────┘│
└─────────┴───────────────────────────────────────────────┘
```

### Stream Player Component

- **Embed**: Twitch iframe, 16:9 aspect ratio, fills container width
- **Rounded corners**: 1.5rem (xl) per design system
- **Top-Light edge**: 1px inner border, primary at 10% opacity
- **Responsive**: Full-width on mobile, max-height 70vh on desktop

### Controls Overlay (Glassmorphic Bar)

Floating at the bottom of the player, 1rem from edges. Semi-transparent with backdrop blur.

Contains three sections:

**Left: Countdown Timer**
- Large display showing time remaining (MM:SS format)
- Uses tertiary (#c1fffe) for digits
- Below timer: small label "TIME REMAINING" or "VOTING OPEN"
- When voting opens (last 5 min): timer pulses/glows with primary color

**Center: Stream Info (Compact)**
- Streamer name + avatar (small)
- Category tag
- Live viewer count (from Twitch)

**Right: Voting Panel**
- **Hidden during first 10 minutes** — shows "Voting opens in X:XX"
- **Visible during last 5 minutes** — two large buttons:
  - ⚡ SKIP (red-ish, uses error color) — with current skip count
  - 💜 STAY +10 (green, uses secondary) — with current stay count
- **After voting**: Shows your vote highlighted, live count updates
- **Below buttons**: Voter count / quorum indicator ("12/5 votes — quorum reached")

### Voting States

1. **Pre-Voting** (first 10 min): 
   - Timer counts down normally
   - Small text: "Voting opens in X:XX"
   
2. **Voting Open** (last 5 min):
   - Timer changes color (primary glow pulse)
   - SKIP and STAY buttons appear with animation (slide up)
   - Live vote counts update in real-time
   - Quorum indicator shows progress (e.g., "3/5 votes needed")

3. **Vote Cast** (user has voted):
   - Selected button highlighted with glow
   - Unselected button dims
   - Live counts still updating
   - Can't change vote

4. **Vote Resolved**:
   - If SKIP: "Stream ending..." with brief transition animation
   - If STAY: "Extended! +10 minutes" celebration animation, timer resets
   - If no quorum: "Not enough votes — stream continues" (neutral)

5. **Stream Reconnecting** (offline detected, grace period active):
   - Glassmorphic overlay covers the entire stream player
   - Center: large 30-second countdown timer (tertiary cyan #c1fffe, display-sm)
   - Below timer: "Stream reconnecting..." pulsing text
   - Below text: subtle loading animation (three dots or spinner)
   - If stream recovers: overlay fades out smoothly (0.3s), resume viewing
   - If grace period expires: overlay transitions to "Loading next stream..." then fades to next embed

6. **Stream Went Offline** (post-grace-period):
   - Brief "Stream went offline" message (1.5s)
   - Automatic transition to next stream with standard stream transition animation

### Stream Info Card (Below Player)

- Streamer avatar (large, 64px), display name, Twitch follower count
- Category/game with box art thumbnail
- "Submitted by [username]" with their avatar
- Link to open stream directly on Twitch (opens new tab)
- Current broadcast stats: time aired, votes this session, extensions count

### Activity Feed

- Real-time scrolling feed of community actions:
  - "[User] voted to STAY"
  - "[User] submitted a new stream"
  - "[User] earned the Trailblazer badge"
  - "[User] boosted [stream]'s cooldown"
- Each entry: avatar + text + timestamp
- Max 20 recent items, auto-scrolls

### Up Next Section

- Horizontal row of 3 cards showing next streams in queue
- Each card: streamer avatar, name, category, submitted by, queue position
- "View full schedule →" link

---

## Page 2: Schedule (/schedule)

Shows the queue of upcoming streams and recently aired broadcasts.

### Layout

```
┌───────────────────────────────────────────────────┐
│  HEADER: "Broadcast Schedule"                      │
│  Subtext: "X streams in queue • Next up in MM:SS" │
├───────────────────────────────────────────────────┤
│                                                    │
│  [Tab: UPCOMING]  [Tab: RECENTLY AIRED]           │
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ #1  🔴 NOW PLAYING                          │  │
│  │ StreamerName • Just Chatting • 5:23 left    │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ #2  StreamerName • Valorant                 │  │
│  │ Submitted by User123 • 2 hours ago          │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ #3  StreamerName • Art                      │  │
│  │ Submitted by User456 • 1 hour ago           │  │
│  └─────────────────────────────────────────────┘  │
│  ...                                               │
│                                                    │
│  RECENTLY AIRED tab:                              │
│  Same cards but with: aired time, watch minutes,  │
│  vote result (skipped/extended/completed),         │
│  viewer count                                      │
└───────────────────────────────────────────────────┘
```

### Queue Card Fields
- Position number
- Streamer avatar + name
- Category
- Submitted by (user avatar + name)
- Time in queue
- Status indicator (waiting, up next)

### Recently Aired Card Additional Fields
- Aired at (time)
- Duration (how long it played)
- Vote result badge: "Skipped" (error) / "Extended x2" (secondary) / "Completed" (neutral)
- Peak viewers

---

## Page 3: Submit (/submit)

Where users submit streams to the queue.

### Layout

```
┌───────────────────────────────────────────────────┐
│  HEADER: "Submit a Stream"                         │
│  Subtext: "Give a streamer their 15 min of fame"  │
├───────────────────────────────────────────────────┤
│                                                    │
│  ┌─────────────────────────────────────────────┐  │
│  │ SEARCH INPUT                                 │  │
│  │ "Enter Twitch username or channel URL..."    │  │
│  │ [SUBMIT BUTTON]                              │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  PREVIEW CARD (appears after valid input):        │
│  ┌─────────────────────────────────────────────┐  │
│  │ Avatar | Name | Category | Viewers | Status │  │
│  │ 🟢 LIVE — Ready to submit                   │  │
│  │ 🔴 OFFLINE — Must be live to submit          │  │
│  │ ⏳ COOLDOWN — Available in 14h 23m           │  │
│  │ 📋 IN QUEUE — Already at position #7         │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  YOUR SUBMISSIONS (history):                      │
│  ┌─────────────────────────────────────────────┐  │
│  │ Recent submissions with status + points      │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  COOLDOWN INFO:                                   │
│  "Streams can air once every 20 hours.            │
│   Earn Zap Points to boost cooldowns!"            │
└───────────────────────────────────────────────────┘
```

### Submission Validation States
1. **Empty**: Just the input field
2. **Loading**: Spinner while checking Twitch API
3. **Live & Available**: Green check, preview card, submit button active
4. **Offline**: Red indicator, "This stream isn't live right now"
5. **In Cooldown**: Clock icon, shows remaining cooldown time, option to boost with points
6. **Already Queued**: Info icon, shows current queue position
7. **Invalid**: "Channel not found on Twitch"

---

## Page 4: Leaderboard (/leaderboard)

Community rankings and gamification hub.

### Layout

```
┌───────────────────────────────────────────────────┐
│  HEADER: "Community Leaderboard"                   │
├───────────────────────────────────────────────────┤
│                                                    │
│  YOUR RANK CARD:                                  │
│  ┌─────────────────────────────────────────────┐  │
│  │ #42 • 1,250 ⚡ • 15 badges • Level: Scout  │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  TABS: [Top Points] [Top Submitters] [Top Voters] │
│  TIME: [This Week] [This Month] [All Time]        │
│                                                    │
│  RANKINGS TABLE:                                  │
│  #  Avatar  Name       Value   Change             │
│  1  🥇     User1      5,430⚡  +12               │
│  2  🥈     User2      4,210⚡  -1                │
│  3  🥉     User3      3,890⚡  +3                │
│  4         User4      3,120⚡  NEW               │
│  ...                                               │
│                                                    │
│  BADGES SHOWCASE:                                 │
│  Grid of all available badges with earn status    │
└───────────────────────────────────────────────────┘
```

### Leaderboard Categories
- **Zap Points**: Total points earned (all time or period)
- **Top Submitters**: Most streams submitted that successfully aired
- **Top Voters**: Most votes cast
- **Kingmakers**: Most extensions earned on submitted streams

---

## Page 5: Profile (/profile)

User's personal dashboard.

### Layout

```
┌───────────────────────────────────────────────────┐
│  PROFILE HEADER:                                   │
│  Large avatar | Twitch name | TwitchZap level     │
│  Joined date | Total ⚡ | Submissions | Votes     │
├───────────────────────────────────────────────────┤
│                                                    │
│  ZAP POINTS:                                      │
│  Current balance: 1,250 ⚡                        │
│  [Point history / transaction log]                 │
│                                                    │
│  BADGES:                                          │
│  Grid of earned badges with dates                 │
│  Grayed-out badges = not yet earned (with hint)   │
│                                                    │
│  MY SUBMISSIONS:                                  │
│  History of submitted streams with outcomes       │
│  - Which got extended, skipped, completed         │
│  - Points earned per submission                    │
│                                                    │
│  MY VOTES:                                        │
│  Vote history with outcomes                       │
│  "Accuracy" stat (voted stay on streams that      │
│  got extended = good taste!)                       │
└───────────────────────────────────────────────────┘
```

---

## Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|-----------|-------|----------------|
| Mobile | < 768px | Single column, bottom tab bar, stacked voting buttons |
| Tablet | 768-1023px | Sidebar hidden, top nav expands, 2-column grid |
| Desktop | ≥ 1024px | Full sidebar, multi-column layouts |

## Key Interactions & Animations

### Vote Button Press
- Button scales down slightly (0.95) on press
- Ripple effect in button color
- Count number increments with a small "pop" animation
- After voting, your selected button gets a glowing border

### Stream Transition
- Current stream fades out (0.3s)
- Brief "loading next stream" state with animated TwitchZap logo
- New stream embed fades in (0.3s)
- Stream info card slides up from below

### Extension Celebration
- When STAY wins: Brief confetti burst (subtle, using primary/secondary particles)
- Timer resets with a satisfying "refill" animation
- "+10 MIN" text pops up and fades

### Voting Window Opening
- Controls overlay expands upward to reveal vote buttons
- Subtle pulse animation on the timer
- Sound effect (optional, user can toggle)

### Queue Position Change
- Cards slide to new positions with spring animation
- Position numbers count up/down

## Accessibility Requirements

- All interactive elements keyboard-navigable
- ARIA labels on vote buttons ("Vote to skip this stream" / "Vote to extend this stream by 10 minutes")
- Reduced motion: disable confetti, simplify transitions
- High contrast mode: ensure all text meets WCAG AA on dark backgrounds
- Screen reader announcements for vote results and stream transitions
