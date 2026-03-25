import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { badges } from "./schema";

const badgeSeedData = [
  {
    slug: "first_submit",
    name: "Trailblazer",
    description: "Submitted your first stream to TwitchZap",
    icon: "\u{1F52D}",
    category: "discovery",
    requirementType: "streams_submitted",
    requirementValue: 1,
    pointsReward: 25,
  },
  {
    slug: "submit_10",
    name: "Talent Scout",
    description: "Submitted 10 streams",
    icon: "\u{1F3AF}",
    category: "discovery",
    requirementType: "streams_submitted",
    requirementValue: 10,
    pointsReward: 100,
  },
  {
    slug: "submit_50",
    name: "Casting Director",
    description: "Submitted 50 streams",
    icon: "\u{1F3AC}",
    category: "discovery",
    requirementType: "streams_submitted",
    requirementValue: 50,
    pointsReward: 500,
  },
  {
    slug: "first_vote",
    name: "Voice Heard",
    description: "Cast your first vote",
    icon: "\u{1F5F3}\uFE0F",
    category: "engagement",
    requirementType: "votes_cast",
    requirementValue: 1,
    pointsReward: 10,
  },
  {
    slug: "vote_100",
    name: "Democracy Champion",
    description: "Cast 100 votes",
    icon: "\u2696\uFE0F",
    category: "engagement",
    requirementType: "votes_cast",
    requirementValue: 100,
    pointsReward: 250,
  },
  {
    slug: "vote_500",
    name: "Community Pillar",
    description: "Cast 500 votes",
    icon: "\u{1F3DB}\uFE0F",
    category: "engagement",
    requirementType: "votes_cast",
    requirementValue: 500,
    pointsReward: 1000,
  },
  {
    slug: "first_extension",
    name: "Crowd Pleaser",
    description: "A stream you submitted got extended",
    icon: "\u{1F525}",
    category: "discovery",
    requirementType: "extensions_earned",
    requirementValue: 1,
    pointsReward: 50,
  },
  {
    slug: "triple_extend",
    name: "Kingmaker",
    description: "A stream you submitted hit max extensions",
    icon: "\u{1F451}",
    category: "discovery",
    requirementType: "extensions_earned_max",
    requirementValue: 1,
    pointsReward: 200,
  },
  {
    slug: "watch_60",
    name: "Marathon Viewer",
    description: "Watched 60 minutes of TwitchZap",
    icon: "\u{1F440}",
    category: "milestone",
    requirementType: "watch_minutes",
    requirementValue: 60,
    pointsReward: 25,
  },
  {
    slug: "watch_600",
    name: "Couch Potato",
    description: "Watched 10 hours of TwitchZap",
    icon: "\u{1F6CB}\uFE0F",
    category: "milestone",
    requirementType: "watch_minutes",
    requirementValue: 600,
    pointsReward: 250,
  },
  {
    slug: "points_1000",
    name: "Zap Collector",
    description: "Earned 1,000 total Zap Points",
    icon: "\u26A1",
    category: "milestone",
    requirementType: "total_points_earned",
    requirementValue: 1000,
    pointsReward: 0,
  },
  {
    slug: "points_10000",
    name: "Lightning Rod",
    description: "Earned 10,000 total Zap Points",
    icon: "\u{1F329}\uFE0F",
    category: "milestone",
    requirementType: "total_points_earned",
    requirementValue: 10000,
    pointsReward: 0,
  },
];

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const database = drizzle(client);

  console.log("Seeding badges...");

  for (const badge of badgeSeedData) {
    await database
      .insert(badges)
      .values(badge)
      .onConflictDoNothing({ target: badges.slug });
  }

  console.log(`Seeded ${badgeSeedData.length} badges.`);

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
