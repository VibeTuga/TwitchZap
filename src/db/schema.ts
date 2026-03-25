import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  numeric,
  jsonb,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "string" });

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    twitchId: text("twitch_id").unique().notNull(),
    twitchUsername: text("twitch_username").notNull(),
    twitchDisplayName: text("twitch_display_name"),
    twitchAvatarUrl: text("twitch_avatar_url"),
    zapPoints: integer("zap_points").default(0).notNull(),
    totalPointsEarned: integer("total_points_earned").default(0).notNull(),
    streamsSubmitted: integer("streams_submitted").default(0).notNull(),
    votesCast: integer("votes_cast").default(0).notNull(),
    watchMinutes: integer("watch_minutes").default(0).notNull(),
    role: text("role").default("member").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_users_total_points").on(table.totalPointsEarned),
    index("idx_users_twitch_id").on(table.twitchId),
    check("users_role_check", sql`${table.role} IN ('member', 'moderator', 'admin')`),
  ]
);

// ─── Streams ──────────────────────────────────────────────────────────────────
export const streams = pgTable(
  "streams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    twitchChannelId: text("twitch_channel_id").unique().notNull(),
    twitchUsername: text("twitch_username").notNull(),
    twitchDisplayName: text("twitch_display_name"),
    twitchAvatarUrl: text("twitch_avatar_url"),
    category: text("category"),
    lastBroadcastAt: timestamptz("last_broadcast_at"),
    cooldownHours: numeric("cooldown_hours", { precision: 5, scale: 2 }).default("20").notNull(),
    baseCooldownHours: numeric("base_cooldown_hours", { precision: 5, scale: 2 }).default("20").notNull(),
    timesFeatured: integer("times_featured").default(0).notNull(),
    timesExtended: integer("times_extended").default(0).notNull(),
    timesSkipped: integer("times_skipped").default(0).notNull(),
    totalWatchMinutes: integer("total_watch_minutes").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
    updatedAt: timestamptz("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_streams_twitch_channel").on(table.twitchChannelId),
    index("idx_streams_cooldown").on(table.lastBroadcastAt),
  ]
);

// ─── Queue ────────────────────────────────────────────────────────────────────
export const queue = pgTable(
  "queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id")
      .references(() => streams.id, { onDelete: "cascade" })
      .notNull(),
    submittedBy: uuid("submitted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull(),
    status: text("status").default("waiting").notNull(),
    submittedAt: timestamptz("submitted_at").defaultNow().notNull(),
    startedAt: timestamptz("started_at"),
    completedAt: timestamptz("completed_at"),
  },
  (table) => [
    index("idx_queue_status_position").on(table.status, table.position),
    index("idx_queue_submitted_by").on(table.submittedBy),
    unique("queue_stream_status_unique").on(table.streamId, table.status),
    check(
      "queue_status_check",
      sql`${table.status} IN ('waiting', 'playing', 'completed', 'cancelled', 'skipped_offline')`
    ),
  ]
);

// ─── Broadcasts ───────────────────────────────────────────────────────────────
export const broadcasts = pgTable(
  "broadcasts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queueEntryId: uuid("queue_entry_id")
      .references(() => queue.id)
      .notNull(),
    streamId: uuid("stream_id")
      .references(() => streams.id)
      .notNull(),
    submittedBy: uuid("submitted_by").references(() => users.id),
    startedAt: timestamptz("started_at").defaultNow().notNull(),
    scheduledEndAt: timestamptz("scheduled_end_at").notNull(),
    actualEndAt: timestamptz("actual_end_at"),
    baseDurationMinutes: integer("base_duration_minutes").default(15).notNull(),
    extensionsCount: integer("extensions_count").default(0).notNull(),
    maxExtensions: integer("max_extensions").default(3).notNull(),
    status: text("status").default("live").notNull(),
    votingOpensAt: timestamptz("voting_opens_at"),
    votingResult: text("voting_result"),
    totalViewers: integer("total_viewers").default(0),
    peakViewers: integer("peak_viewers").default(0),
    totalVotes: integer("total_votes").default(0),
    skipVotes: integer("skip_votes").default(0),
    stayVotes: integer("stay_votes").default(0),
    streamTitle: text("stream_title"),
    streamCategory: text("stream_category"),
    streamViewerCount: integer("stream_viewer_count"),
    offlineDetectedAt: timestamptz("offline_detected_at"),
    offlineDetectionMethod: text("offline_detection_method"),
    gracePeriodExpiresAt: timestamptz("grace_period_expires_at"),
    offlineReporters: jsonb("offline_reporters").default("[]"),
    recoveryCount: integer("recovery_count").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_broadcasts_status").on(table.status),
    index("idx_broadcasts_stream").on(table.streamId),
    index("idx_broadcasts_started").on(table.startedAt),
    check(
      "broadcasts_status_check",
      sql`${table.status} IN ('live', 'voting', 'extended', 'completed', 'skipped', 'ended_offline')`
    ),
    check(
      "broadcasts_voting_result_check",
      sql`${table.votingResult} IN ('skip', 'stay', 'no_quorum', 'pending') OR ${table.votingResult} IS NULL`
    ),
    check(
      "broadcasts_offline_method_check",
      sql`${table.offlineDetectionMethod} IN ('helix_api', 'embed_event', 'viewer_consensus') OR ${table.offlineDetectionMethod} IS NULL`
    ),
  ]
);

// ─── Votes ────────────────────────────────────────────────────────────────────
export const votes = pgTable(
  "votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    broadcastId: uuid("broadcast_id")
      .references(() => broadcasts.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    vote: text("vote").notNull(),
    extensionRound: integer("extension_round").default(0).notNull(),
    votedAt: timestamptz("voted_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_votes_broadcast").on(table.broadcastId),
    index("idx_votes_user").on(table.userId),
    unique("votes_broadcast_user_round_unique").on(
      table.broadcastId,
      table.userId,
      table.extensionRound
    ),
    check("votes_vote_check", sql`${table.vote} IN ('skip', 'stay')`),
  ]
);

// ─── Point Transactions ──────────────────────────────────────────────────────
export const pointTransactions = pgTable(
  "point_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    referenceId: uuid("reference_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_points_user").on(table.userId, table.createdAt),
    check(
      "point_transactions_reason_check",
      sql`${table.reason} IN ('watching', 'voting', 'submitting', 'extension_bonus', 'discovery_bonus', 'cooldown_boost', 'queue_priority', 'badge_reward', 'admin_adjustment')`
    ),
  ]
);

// ─── Badges ───────────────────────────────────────────────────────────────────
export const badges = pgTable(
  "badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").unique().notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    category: text("category").notNull(),
    requirementType: text("requirement_type").notNull(),
    requirementValue: integer("requirement_value").notNull(),
    pointsReward: integer("points_reward").default(0).notNull(),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "badges_category_check",
      sql`${table.category} IN ('discovery', 'engagement', 'milestone', 'special')`
    ),
  ]
);

// ─── User Badges ──────────────────────────────────────────────────────────────
export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    badgeId: uuid("badge_id")
      .references(() => badges.id, { onDelete: "cascade" })
      .notNull(),
    earnedAt: timestamptz("earned_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_badges_user").on(table.userId),
    unique("user_badges_user_badge_unique").on(table.userId, table.badgeId),
  ]
);

// ─── Viewer Sessions ─────────────────────────────────────────────────────────
export const viewerSessions = pgTable(
  "viewer_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    broadcastId: uuid("broadcast_id")
      .references(() => broadcasts.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    joinedAt: timestamptz("joined_at").defaultNow().notNull(),
    leftAt: timestamptz("left_at"),
    watchSeconds: integer("watch_seconds").default(0).notNull(),
    pointsAwarded: integer("points_awarded").default(0).notNull(),
  },
  (table) => [
    index("idx_viewer_sessions_broadcast").on(table.broadcastId),
    unique("viewer_sessions_broadcast_user_unique").on(
      table.broadcastId,
      table.userId
    ),
  ]
);

// ─── Cooldown Boosts ─────────────────────────────────────────────────────────
export const cooldownBoosts = pgTable(
  "cooldown_boosts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    streamId: uuid("stream_id")
      .references(() => streams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    boostType: text("boost_type").notNull(),
    hoursReduced: numeric("hours_reduced", { precision: 5, scale: 2 }).notNull(),
    pointsSpent: integer("points_spent").default(0),
    createdAt: timestamptz("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_cooldown_boosts_stream").on(table.streamId),
    check(
      "cooldown_boosts_type_check",
      sql`${table.boostType} IN ('zap_points', 'extension_streak', 'max_extension', 'community_follow')`
    ),
  ]
);
