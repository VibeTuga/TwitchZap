import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Handle OAuth error responses
  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  if (oauthError) {
    const params = new URLSearchParams({ error: oauthError });
    if (oauthErrorDescription) {
      params.set("error_description", oauthErrorDescription);
    }
    return NextResponse.redirect(`${origin}/auth/login?${params.toString()}`);
  }

  // Determine redirect destination from 'next' param (default to '/')
  const next = searchParams.get("next") ?? "/";
  const redirectTo = next.startsWith("/") ? `${origin}${next}` : origin;

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=missing_code`
    );
  }

  // Build the redirect response first so we can attach cookies to it
  let response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.redirect(redirectTo);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=exchange_failed&error_description=${encodeURIComponent(error.message)}`
    );
  }

  if (data.user) {
    // Upsert user profile
    const meta = data.user.user_metadata;
    const twitchId = meta?.sub || meta?.provider_id;
    const twitchUsername = meta?.preferred_username || meta?.user_name || meta?.nickname || meta?.slug;

    if (twitchId && twitchUsername) {
      const displayName = meta?.nickname || meta?.name || meta?.full_name || twitchUsername;
      const avatar = meta?.picture || meta?.avatar_url || null;

      try {
        await db
          .insert(users)
          .values({
            id: data.user.id,
            twitchId,
            twitchUsername,
            twitchDisplayName: displayName,
            twitchAvatarUrl: avatar,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              twitchUsername,
              twitchDisplayName: displayName,
              twitchAvatarUrl: avatar,
              updatedAt: sql`now()`,
            },
          });
      } catch (err) {
        console.error(
          "[auth/callback] Profile upsert failed for user:",
          data.user.id,
          err
        );
      }
    }
  }

  return response;
}
