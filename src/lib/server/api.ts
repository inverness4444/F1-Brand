import { NextResponse } from "next/server";
import { ZodError } from "zod";

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

    return NextResponse.json({ error: error.message || fallback }, { status });
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
