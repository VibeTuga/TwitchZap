"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeDisplay } from "@/components/gamification/BadgeDisplay";

interface UserProfile {
  twitchDisplayName: string | null;
  twitchUsername: string;
  twitchAvatarUrl: string | null;
  zapPoints: number;
  totalPointsEarned: number;
  streamsSubmitted: number;
  votesCast: number;
  watchMinutes: number;
  role: string;
  createdAt: string;
}

interface BadgeData {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  pointsReward: number;
}

interface EarnedBadgeData {
  badgeId: string;
  earnedAt: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  pointsReward: number;
}

interface Transaction {
  id: string;
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

interface Submission {
  id: string;
  status: string;
  submittedAt: string;
  streamName: string | null;
  streamUsername: string;
  streamAvatar: string | null;
  streamCategory: string | null;
  broadcastId: string | null;
  broadcastStatus: string | null;
  broadcastVotingResult: string | null;
  broadcastExtensions: number | null;
  broadcastPeakViewers: number | null;
  broadcastStartedAt: string | null;
  broadcastActualEndAt: string | null;
  pointsEarned?: number;
}

interface VoteEntry {
  id: string;
  vote: string;
  extensionRound: number;
  votedAt: string;
  broadcastId: string;
  broadcastStatus: string;
  broadcastVotingResult: string | null;
  broadcastExtensions: number;
  streamName: string | null;
  streamUsername: string;
  streamAvatar: string | null;
}

interface ProfileContentProps {
  user: UserProfile;
  allBadges: BadgeData[];
  earnedBadges: EarnedBadgeData[];
  transactions: Transaction[];
  submissions: Submission[];
  votes: VoteEntry[];
  voteAccuracy: number | null;
}

const reasonLabels: Record<string, string> = {
  watching: "Watch time",
  voting: "Voted",
  submitting: "Stream submitted",
  extension_bonus: "Extension bonus",
  discovery_bonus: "Discovery bonus",
  cooldown_boost: "Cooldown boost",
  queue_priority: "Queue priority",
  badge_reward: "Badge reward",
  admin_adjustment: "Admin adjustment",
};

function getLevelTitle(points: number): string {
  if (points >= 10000) return "Legend";
  if (points >= 5000) return "Veteran";
  if (points >= 2000) return "Explorer";
  if (points >= 500) return "Scout";
  if (points >= 100) return "Newcomer";
  return "Rookie";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getRoleBadge(role: string) {
  if (role === "admin") {
    return (
      <span className="text-xs font-bold text-error bg-error-container/20 px-2 py-0.5 rounded-full">
        Admin
      </span>
    );
  }
  if (role === "moderator") {
    return (
      <span className="text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
        Moderator
      </span>
    );
  }
  return null;
}

function getOutcomeBadge(result: string | null, status: string | null) {
  if (result === "stay") {
    return (
      <span className="text-xs font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
        Extended
      </span>
    );
  }
  if (result === "skip") {
    return (
      <span className="text-xs font-bold text-error bg-error-container/20 px-2 py-0.5 rounded-full">
        Skipped
      </span>
    );
  }
  if (status === "completed" || result === "no_quorum") {
    return (
      <span className="text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-full">
        Completed
      </span>
    );
  }
  if (status === "ended_offline") {
    return (
      <span className="text-xs font-bold text-on-surface-variant bg-surface-variant/50 px-2 py-0.5 rounded-full">
        Went Offline
      </span>
    );
  }
  if (status === "waiting" || status === "playing") {
    return (
      <span className="text-xs font-bold text-primary bg-primary-dim/20 px-2 py-0.5 rounded-full">
        {status === "playing" ? "Live" : "In Queue"}
      </span>
    );
  }
  return null;
}

export function ProfileContent({
  user,
  allBadges,
  earnedBadges,
  transactions,
  submissions,
  votes,
  voteAccuracy,
}: ProfileContentProps) {
  const displayName = user.twitchDisplayName ?? user.twitchUsername;
  const level = getLevelTitle(user.totalPointsEarned);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex items-center gap-5">
        <Avatar className="w-20 h-20 rounded-full border-2 border-primary-dim shrink-0">
          <AvatarImage src={user.twitchAvatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-full text-2xl font-bold">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-headline font-black text-on-surface truncate">
              {displayName}
            </h1>
            {getRoleBadge(user.role)}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-on-surface-variant flex-wrap">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">star</span>
              {level}
            </span>
            <span>Joined {formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon="bolt"
          label="Zap Points"
          value={user.totalPointsEarned.toLocaleString()}
          iconColor="text-primary-dim"
        />
        <StatCard
          icon="upload"
          label="Submitted"
          value={user.streamsSubmitted.toLocaleString()}
          iconColor="text-secondary"
        />
        <StatCard
          icon="how_to_vote"
          label="Votes Cast"
          value={user.votesCast.toLocaleString()}
          iconColor="text-tertiary"
        />
        <StatCard
          icon="schedule"
          label="Watch Minutes"
          value={user.watchMinutes.toLocaleString()}
          iconColor="text-primary"
        />
      </div>

      {/* Zap Points Section */}
      <section className="bg-surface-container-low rounded-[1.5rem] p-6 space-y-4">
        <h2 className="text-xl font-headline font-black text-on-surface">
          Zap Points
        </h2>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-dim text-3xl">
            bolt
          </span>
          <span className="text-4xl font-headline font-black text-on-surface">
            {user.zapPoints.toLocaleString()}
          </span>
          <span className="text-on-surface-variant text-sm">current balance</span>
        </div>

        {transactions.length > 0 && (
          <div className="max-h-64 overflow-y-auto space-y-1 mt-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container"
              >
                <span
                  className={`material-symbols-outlined text-base ${
                    tx.amount >= 0 ? "text-secondary" : "text-error"
                  }`}
                >
                  {tx.amount >= 0 ? "add_circle" : "remove_circle"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface truncate">
                    {reasonLabels[tx.reason] ?? tx.reason}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {timeAgo(tx.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-headline font-bold ${
                      tx.amount >= 0 ? "text-secondary" : "text-error"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    bal: {tx.balanceAfter.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {transactions.length === 0 && (
          <p className="text-sm text-on-surface-variant py-4 text-center">
            No transactions yet. Start watching and voting to earn points!
          </p>
        )}
      </section>

      {/* Badges Section */}
      <section className="bg-surface-container-low rounded-[1.5rem] p-6 space-y-4">
        <h2 className="text-xl font-headline font-black text-on-surface">
          Badges
        </h2>
        <BadgeDisplay
          allBadges={allBadges}
          earnedBadges={earnedBadges}
          userStats={{
            streamsSubmitted: user.streamsSubmitted,
            votesCast: user.votesCast,
            watchMinutes: user.watchMinutes,
            totalPointsEarned: user.totalPointsEarned,
          }}
        />
      </section>

      {/* My Submissions Section */}
      <section className="bg-surface-container-low rounded-[1.5rem] p-6 space-y-4">
        <h2 className="text-xl font-headline font-black text-on-surface">
          My Submissions
        </h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-4 text-center">
            No submissions yet. Submit a stream to get started!
          </p>
        ) : (
          <div className="space-y-1">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container"
              >
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarImage
                    src={sub.streamAvatar ?? undefined}
                    alt={sub.streamName ?? sub.streamUsername}
                  />
                  <AvatarFallback className="bg-surface-variant text-on-surface-variant rounded-lg text-xs">
                    {(sub.streamName ?? sub.streamUsername).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-headline font-bold text-on-surface truncate">
                      {sub.streamName ?? sub.streamUsername}
                    </span>
                    {sub.streamCategory && (
                      <span className="text-xs text-on-surface-variant hidden sm:inline">
                        {sub.streamCategory}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {timeAgo(sub.submittedAt)}
                    {sub.broadcastPeakViewers != null &&
                      sub.broadcastPeakViewers > 0 && (
                        <span>
                          {" "}
                          &middot; {sub.broadcastPeakViewers} peak viewers
                        </span>
                      )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {getOutcomeBadge(sub.broadcastVotingResult, sub.broadcastStatus ?? sub.status)}
                  {sub.pointsEarned != null && sub.pointsEarned > 0 && (
                    <span className="text-xs font-bold text-secondary">
                      +{sub.pointsEarned}
                      <span className="material-symbols-outlined text-xs ml-0.5 align-middle">
                        bolt
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Votes Section */}
      <section className="bg-surface-container-low rounded-[1.5rem] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-headline font-black text-on-surface">
            My Votes
          </h2>
          {voteAccuracy !== null && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-base">
                target
              </span>
              <span className="text-sm font-headline font-bold text-on-surface">
                {voteAccuracy}%
              </span>
              <span className="text-xs text-on-surface-variant">accuracy</span>
            </div>
          )}
        </div>
        {votes.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-4 text-center">
            No votes yet. Vote during broadcasts to build your history!
          </p>
        ) : (
          <div className="space-y-1">
            {votes.map((v) => {
              const wasCorrect =
                v.vote === "stay" &&
                (v.broadcastExtensions > 0 ||
                  v.broadcastVotingResult === "stay");

              return (
                <div
                  key={v.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-container"
                >
                  <span
                    className={`material-symbols-outlined text-base shrink-0 ${
                      v.vote === "stay" ? "text-secondary" : "text-error"
                    }`}
                  >
                    {v.vote === "stay" ? "thumb_up" : "thumb_down"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-headline font-bold text-on-surface truncate">
                        {v.streamName ?? v.streamUsername}
                      </span>
                      {v.extensionRound > 0 && (
                        <span className="text-xs text-on-surface-variant">
                          Round {v.extensionRound + 1}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Voted{" "}
                      <span
                        className={
                          v.vote === "stay" ? "text-secondary" : "text-error"
                        }
                      >
                        {v.vote.toUpperCase()}
                      </span>{" "}
                      &middot; {timeAgo(v.votedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getOutcomeBadge(v.broadcastVotingResult, v.broadcastStatus)}
                    {wasCorrect && (
                      <span className="material-symbols-outlined text-secondary text-sm">
                        check_circle
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconColor,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <div className="bg-surface-container rounded-[1.5rem] p-4 text-center">
      <span className={`material-symbols-outlined text-2xl ${iconColor}`}>
        {icon}
      </span>
      <p className="text-lg font-headline font-bold text-on-surface mt-1">
        {value}
      </p>
      <p className="text-xs text-on-surface-variant">{label}</p>
    </div>
  );
}
