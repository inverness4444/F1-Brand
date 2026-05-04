"use client";

import type { StateStorage } from "zustand/middleware";
import type { ZodType, ZodTypeDef } from "zod";

type SchemaLike<T> = ZodType<T, ZodTypeDef, unknown>;
const mutationQueues = new Map<string, Promise<unknown>>();

export function isBrowser() {
  return typeof window !== "undefined";
}

export function parseJsonSafe<T = unknown>(rawValue: string | null) {
  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return undefined;
  }
}

export function validateStoredData<T>(value: unknown, schema?: SchemaLike<T>) {
  if (!schema) {
    return value as T;
  }

  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

function getRawLocalStorageItem(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setRawLocalStorageItem(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota and private mode failures.
  }
}

export function removeItemSafe(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function getItemSafe<T>(key: string, fallback: T, schema?: SchemaLike<T>) {
  const rawValue = getRawLocalStorageItem(key);

  if (rawValue === null) {
    return fallback;
  }

  const parsed = parseJsonSafe(rawValue);

  if (typeof parsed === "undefined") {
    removeItemSafe(key);
    return fallback;
  }

  const validated = validateStoredData(parsed, schema);

  if (validated === null) {
    removeItemSafe(key);
    return fallback;
  }

  return validated;
}

export function setItemSafe<T>(key: string, value: T, schema?: SchemaLike<T>) {
  const validated = validateStoredData(value, schema);

  if (validated === null) {
    return;
  }

  setRawLocalStorageItem(key, JSON.stringify(validated));
}

export function createSafeStateStorage<T = unknown>(schema?: SchemaLike<T>): StateStorage {
  return {
    getItem: (name) => {
      const rawValue = getRawLocalStorageItem(name);

      if (rawValue === null || !schema) {
        return rawValue;
      }

      const parsed = parseJsonSafe(rawValue);

      if (typeof parsed === "undefined") {
        removeItemSafe(name);
        return null;
      }

      const validated = validateStoredData(parsed, schema);

      if (validated === null) {
        removeItemSafe(name);
        return null;
      }

      return JSON.stringify(validated);
    },
    setItem: (name, value) => {
      if (!schema) {
        setRawLocalStorageItem(name, value);
        return;
      }

      const parsed = parseJsonSafe(value);

      if (typeof parsed === "undefined") {
        return;
      }

      const validated = validateStoredData(parsed, schema);

      if (validated === null) {
        return;
      }

      setRawLocalStorageItem(name, JSON.stringify(validated));
    },
    removeItem: (name) => {
      removeItemSafe(name);
    },
  };
}

export function runSerializedMutation<T>(scope: string, task: () => T | Promise<T>) {
  const previous = mutationQueues.get(scope) ?? Promise.resolve();
  const nextTask = previous.catch(() => undefined).then(task);
  const cleanupTask = nextTask.then(
    () => undefined,
    () => undefined,
  );

  mutationQueues.set(scope, cleanupTask);
  return nextTask.finally(() => {
    if (mutationQueues.get(scope) === cleanupTask) {
      mutationQueues.delete(scope);
    }
  });
}
