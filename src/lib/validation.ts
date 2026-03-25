const TWITCH_USERNAME_RE = /^[a-zA-Z0-9_]{1,25}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidTwitchUsername(value: unknown): value is string {
  return typeof value === "string" && TWITCH_USERNAME_RE.test(value);
}

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isValidVote(value: unknown): value is "skip" | "stay" {
  return value === "skip" || value === "stay";
}

export function isValidLivenessStatus(
  value: unknown
): value is "offline" | "online" {
  return value === "offline" || value === "online";
}
