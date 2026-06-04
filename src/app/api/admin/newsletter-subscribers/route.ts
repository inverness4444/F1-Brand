import type { NewsletterSubscriberStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError, noStoreJson } from "@/lib/server/api";
import { requireAdminApiUser } from "@/lib/server/admin-auth";
import { enforceRateLimit } from "@/lib/server/request-security";
import { sanitizeSearchQuery } from "@/lib/security-utils";

export const runtime = "nodejs";

const subscriberStatusValues = new Set(["ACTIVE", "UNSUBSCRIBED"]);

function parseStatus(value: string | null): NewsletterSubscriberStatus | null {
  return value && subscriberStatusValues.has(value) ? (value as NewsletterSubscriberStatus) : null;
}

function subscriberWhere(searchParams: URLSearchParams): Prisma.NewsletterSubscriberWhereInput {
  const q = sanitizeSearchQuery(searchParams.get("q") ?? "");
  const status = parseStatus(searchParams.get("status"));
  const where: Prisma.NewsletterSubscriberWhereInput = {};

  if (q) {
    where.email = {
      contains: q,
      mode: "insensitive",
    };
  }

  if (status) {
    where.status = status;
  }

  return where;
}

function csvCell(value: string | null | undefined) {
  const text = value ?? "";
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function subscribersCsv(
  subscribers: Array<{
    email: string;
    status: string;
    source: string | null;
    createdAt: Date;
  }>,
) {
  const header = ["email", "status", "createdAt", "source"];
  const rows = subscribers.map((subscriber) =>
    [
      csvCell(subscriber.email),
      csvCell(subscriber.status),
      csvCell(subscriber.createdAt.toISOString()),
      csvCell(subscriber.source),
    ].join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-newsletter-subscribers", {
      maxAttempts: 120,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    await requireAdminApiUser();

    const where = subscriberWhere(request.nextUrl.searchParams);
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where,
      select: {
        email: true,
        status: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (request.nextUrl.searchParams.get("format") === "csv") {
      return new NextResponse(`\uFEFF${subscribersCsv(subscribers)}`, {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Content-Disposition": 'attachment; filename="velocity-newsletter-subscribers.csv"',
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    return noStoreJson({
      subscribers: subscribers.map((subscriber) => ({
        email: subscriber.email,
        status: subscriber.status,
        source: subscriber.source,
        createdAt: subscriber.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return apiError(error, "Не удалось загрузить подписчиков.");
  }
}
