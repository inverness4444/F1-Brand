"use client";

import { z } from "zod";

import { readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { sanitizeIdentifier } from "@/lib/security-utils";

type RateLimitAction = "login" | "register" | "forgot-password";

const rateLimitConfig: Record<RateLimitAction, { maxAttempts: number; windowMs: number; message: string }> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    message: "Слишком много попыток входа. Попробуйте снова через несколько минут.",
  },
  register: {
    maxAttempts: 3,
    windowMs: 15 * 60 * 1000,
    message: "Слишком много попыток регистрации. Попробуйте снова через несколько минут.",
  },
  "forgot-password": {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    message: "Слишком много запросов на восстановление. Попробуйте позже.",
  },
};

const rateLimitEntrySchema = z.object({
  attempts: z.number().int().min(0),
  resetAt: z.number().int().positive(),
});

const rateLimitStateSchema = z.record(rateLimitEntrySchema);

type RateLimitState = z.infer<typeof rateLimitStateSchema>;

function readRateLimitState() {
  return readStorage<RateLimitState>(storageKeys.authRateLimit, {}, rateLimitStateSchema);
}

function writeRateLimitState(state: RateLimitState) {
  writeStorage(storageKeys.authRateLimit, state, rateLimitStateSchema);
}

function createRateLimitKey(action: RateLimitAction, identifier: string) {
  const safeIdentifier = sanitizeIdentifier(identifier, "anonymous");
  return `${action}:${safeIdentifier || "anonymous"}`;
}

function pruneExpiredEntries(state: RateLimitState, now = Date.now()) {
  return Object.fromEntries(
    Object.entries(state).filter(([, entry]) => entry.resetAt > now),
  );
}

export const clientRateLimitService = {
  assertAllowed(action: RateLimitAction, identifier: string) {
    const config = rateLimitConfig[action];
    const now = Date.now();
    const key = createRateLimitKey(action, identifier);
    const currentState = pruneExpiredEntries(readRateLimitState(), now);
    const currentEntry = currentState[key];

    if (currentEntry && currentEntry.attempts >= config.maxAttempts) {
      writeRateLimitState(currentState);
      throw new Error(config.message);
    }

    const nextEntry = currentEntry
      ? {
          attempts: currentEntry.attempts + 1,
          resetAt: currentEntry.resetAt,
        }
      : {
          attempts: 1,
          resetAt: now + config.windowMs,
        };

    writeRateLimitState({
      ...currentState,
      [key]: nextEntry,
    });
  },

  clear(action: RateLimitAction, identifier: string) {
    const key = createRateLimitKey(action, identifier);
    const currentState = pruneExpiredEntries(readRateLimitState());

    if (!(key in currentState)) {
      return;
    }

    delete currentState[key];
    writeRateLimitState(currentState);
  },
};
