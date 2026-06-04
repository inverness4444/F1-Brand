import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/server/api";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";
import { newsletterSubscriptionSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

const SUBSCRIBED_MESSAGE = "Спасибо, вы подписались на новости Velocity Club";
const ALREADY_SUBSCRIBED_MESSAGE = "Вы уже подписаны";

function subscriberPayload(subscriber: { email: string; status: string; source: string | null }) {
  return {
    email: subscriber.email,
    status: subscriber.status,
    source: subscriber.source,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "newsletter-subscribe", {
      maxAttempts: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertProtectedMutation(request);

    const input = newsletterSubscriptionSchema.parse(await request.json());
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: input.email },
      select: {
        email: true,
        status: true,
        source: true,
      },
    });

    if (existingSubscriber?.status === "ACTIVE") {
      return NextResponse.json({
        ok: true,
        alreadySubscribed: true,
        message: ALREADY_SUBSCRIBED_MESSAGE,
        subscriber: subscriberPayload(existingSubscriber),
      });
    }

    if (existingSubscriber) {
      const subscriber = await prisma.newsletterSubscriber.update({
        where: { email: input.email },
        data: {
          status: "ACTIVE",
          source: input.source,
        },
        select: {
          email: true,
          status: true,
          source: true,
        },
      });

      return NextResponse.json({
        ok: true,
        alreadySubscribed: false,
        message: SUBSCRIBED_MESSAGE,
        subscriber: subscriberPayload(subscriber),
      });
    }

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email: input.email,
        source: input.source,
      },
      select: {
        email: true,
        status: true,
        source: true,
      },
    });

    return NextResponse.json({
      ok: true,
      alreadySubscribed: false,
      message: SUBSCRIBED_MESSAGE,
      subscriber: subscriberPayload(subscriber),
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({
        ok: true,
        alreadySubscribed: true,
        message: ALREADY_SUBSCRIBED_MESSAGE,
      });
    }

    return apiError(error, "Не удалось оформить подписку.");
  }
}
