import type { NextRequest } from "next/server";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/security-utils";

type RateLimitResult = { allowed: true; retryAfterSeconds: 0 } | { allowed: false; retryAfterSeconds: number };

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function pruneRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getRedisRateLimitConfig() {
  const url = process.env.RATE_LIMIT_REDIS_REST_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.RATE_LIMIT_REDIS_REST_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return {
    url: url.replace(/\/+$/, ""),
    token,
  };
}

function getRequestOrigins(request: NextRequest) {
  const origins = new Set([new URL(request.url).origin]);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? request.headers.get("host");

  if (host) {
    const protocol = forwardedProto ?? new URL(request.url).protocol.replace(/:$/, "");
    origins.add(`${protocol}://${host}`);
  }

  return origins;
}

async function runRedisPipeline(commands: unknown[][]) {
  const config = getRedisRateLimitConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("rate-limit-provider-error");
  }

  return (await response.json()) as Array<{ result?: unknown; error?: string }>;
}

async function enforceRedisRateLimit(
  bucketKey: string,
  { maxAttempts, windowMs }: { maxAttempts: number; windowMs: number },
): Promise<RateLimitResult | null> {
  const redisKey = `rate-limit:${bucketKey}`;
  const initial = await runRedisPipeline([
    ["INCR", redisKey],
    ["PTTL", redisKey],
  ]);

  if (!initial) {
    return null;
  }

  const count = Number(initial[0]?.result ?? 0);
  let ttl = Number(initial[1]?.result ?? -1);

  if (!Number.isFinite(count) || initial.some((item) => item.error)) {
    throw new Error("rate-limit-provider-error");
  }

  if (count === 1 || ttl < 0) {
    const expireResult = await runRedisPipeline([
      ["PEXPIRE", redisKey, windowMs],
      ["PTTL", redisKey],
    ]);
    ttl = Number(expireResult?.[1]?.result ?? windowMs);
  }

  if (count > maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expectedOrigins = getRequestOrigins(request);

  if (origin && !expectedOrigins.has(origin)) {
    throw new Error("forbidden-origin");
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin && fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    throw new Error("forbidden-origin");
  }
}

export function assertCsrfToken(request: NextRequest) {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new Error("invalid-csrf");
  }
}

export function assertProtectedMutation(request: NextRequest) {
  assertSameOrigin(request);
  assertCsrfToken(request);
}

export async function enforceRateLimit(
  request: NextRequest,
  key: string,
  { maxAttempts, windowMs }: { maxAttempts: number; windowMs: number },
) {
  const now = Date.now();
  pruneRateLimitBuckets(now);

  const bucketKey = `${key}:${getClientIdentifier(request)}`;
  const hasRedisProvider = Boolean(getRedisRateLimitConfig());
  const redisResult = hasRedisProvider
    ? await enforceRedisRateLimit(bucketKey, { maxAttempts, windowMs }).catch(() => null)
    : null;

  if (redisResult) {
    return redisResult;
  }

  if (hasRedisProvider && process.env.NODE_ENV === "production") {
    return { allowed: false, retryAfterSeconds: 60 };
  }

  const bucket = rateLimitBuckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  rateLimitBuckets.set(bucketKey, bucket);

  return { allowed: true, retryAfterSeconds: 0 };
}
