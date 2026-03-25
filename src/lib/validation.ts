const TWITCH_USERNAME_RE = /^[a-zA-Z0-9_]{1,25}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TWITCH_URL_RE =
  /^(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{1,25})\/?(?:\?.*)?$/;

export function validateOrigin(request: Request): boolean {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true; // Skip validation if not configured

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const allowedHostname = new URL(appUrl).hostname;

  if (origin) {
    try {
      const requestHostname = new URL(origin).hostname;
      if (requestHostname !== allowedHostname) {
        console.warn(`[validateOrigin] REJECTED: origin="${origin}" (hostname="${requestHostname}") vs allowed="${allowedHostname}" (from APP_URL="${appUrl}")`);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  if (referer) {
    try {
      return new URL(referer).hostname === allowedHostname;
    } catch {
      return false;
    }
  }

  // No origin or referer header — likely a server-side or same-origin request
  return true;
}

export function parseTwitchInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try matching as a Twitch URL first
  const urlMatch = trimmed.match(TWITCH_URL_RE);
  if (urlMatch) {
    const username = urlMatch[1].toLowerCase();
    return TWITCH_USERNAME_RE.test(username) ? username : null;
  }

  // Try as a raw username
  if (TWITCH_USERNAME_RE.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

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
