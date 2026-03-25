const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const TWITCH_API_URL = "https://api.twitch.tv/helix";

interface AppToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: AppToken | null = null;

export async function getAppAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  }

  const res = await fetch(TWITCH_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = await res.json();

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
}

function invalidateToken() {
  cachedToken = null;
}

async function helixFetch(path: string, retries = 1): Promise<Response> {
  const token = await getAppAccessToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;

  const res = await fetch(`${TWITCH_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId,
    },
  });

  if (res.status === 401 && retries > 0) {
    invalidateToken();
    return helixFetch(path, retries - 1);
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return helixFetch(path, retries);
  }

  if (res.status >= 500) {
    throw new Error(`Twitch API server error: ${res.status}`);
  }

  return res;
}

export interface TwitchStreamData {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  viewer_count: number;
  started_at: string;
  thumbnail_url: string;
}

export async function getStreamInfo(
  username: string
): Promise<TwitchStreamData | null> {
  const res = await helixFetch(
    `/streams?user_login=${encodeURIComponent(username)}`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch stream info: ${res.status}`);
  }

  const data = await res.json();
  return data.data?.[0] ?? null;
}

export interface TwitchUserData {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  description: string;
  created_at: string;
}

export async function getUserInfo(
  username: string
): Promise<TwitchUserData | null> {
  const res = await helixFetch(
    `/users?login=${encodeURIComponent(username)}`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch user info: ${res.status}`);
  }

  const data = await res.json();
  return data.data?.[0] ?? null;
}
