import { NextResponse } from "next/server";
import { ZodError } from "zod";

const SENSITIVE_ERROR_PATTERNS = [
  /prisma/i,
  /database/i,
  /\bsql\b/i,
  /\bselect\b/i,
  /\binsert\b/i,
  /\bupdate\b/i,
  /\bdelete\b/i,
  /auth_secret/i,
  /nextauth_secret/i,
  /secret/i,
  /token/i,
  /password/i,
  /\/Users\//i,
  /node_modules/i,
  /enoent/i,
];

function getSafeErrorMessage(error: Error, fallback: string, status: number) {
  if (process.env.NODE_ENV === "production" && status >= 500) {
    return fallback;
  }

  const message = error.message || fallback;

  if (SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return message;
}

export function apiError(error: unknown, fallback = "Не удалось выполнить запрос.", status = 500) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Переданы некорректные данные.", issues: error.issues }, { status: 400 });
  }

  if (error instanceof Error) {
    if (error.message === "unauthorized") {
      return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    }

    if (error.message === "forbidden") {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    if (error.message === "forbidden-origin" || error.message === "invalid-csrf") {
      return NextResponse.json({ error: "Недостаточно прав для выполнения операции." }, { status: 403 });
    }

    return NextResponse.json({ error: getSafeErrorMessage(error, fallback, status) }, { status });
  }

  return NextResponse.json({ error: fallback }, { status });
}

export function noStoreJson<T>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, {
    ...init,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      ...init?.headers,
    },
  });
}
