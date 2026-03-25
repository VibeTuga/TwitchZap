type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
  limit: number;
};

type TokenRecord = {
  count: number;
  expiresAt: number;
};

export class RateLimitError extends Error {
  status = 429;
  constructor() {
    super("Rate limit exceeded");
  }
}

export function rateLimit(options: RateLimitOptions) {
  const { interval, uniqueTokenPerInterval, limit } = options;
  const tokenMap = new Map<string, TokenRecord>();

  // Periodic cleanup of expired entries
  const cleanup = () => {
    const now = Date.now();
    if (tokenMap.size > uniqueTokenPerInterval) {
      for (const [key, record] of tokenMap) {
        if (record.expiresAt <= now) {
          tokenMap.delete(key);
        }
      }
    }
  };

  return {
    check(key: string): void {
      cleanup();

      const now = Date.now();
      const record = tokenMap.get(key);

      if (!record || record.expiresAt <= now) {
        tokenMap.set(key, { count: 1, expiresAt: now + interval });
        return;
      }

      if (record.count >= limit) {
        throw new RateLimitError();
      }

      record.count += 1;
    },
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "anonymous";
}
