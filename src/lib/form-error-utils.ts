import { ZodError } from "zod";

export function getZodFieldErrors<T extends string>(error: unknown) {
  if (!(error instanceof ZodError)) {
    return {} as Partial<Record<T | "form", string>>;
  }

  const flattened = error.flatten().fieldErrors;
  const entries = Object.entries(flattened)
    .map(([key, value]) => [key, value?.[0]])
    .filter((entry): entry is [string, string] => Boolean(entry[1]));

  return Object.fromEntries(entries) as Partial<Record<T | "form", string>>;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
