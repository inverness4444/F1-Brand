import { NextRequest, NextResponse } from "next/server";

import { handleYooKassaWebhook } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_MOCK_PAYMENTS !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const rateLimit = await enforceRateLimit(request, "mock-payment-confirm", {
    maxAttempts: 30,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Повторите позже." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const providerPaymentId = request.nextUrl.searchParams.get("paymentId");

  if (!providerPaymentId) {
    return NextResponse.json({ error: "Payment id is required." }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      provider: "MOCK",
      providerPaymentId,
    },
    include: {
      order: true,
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment was not found." }, { status: 404 });
  }

  await handleYooKassaWebhook({
    type: "notification",
    event: "payment.succeeded",
    object: {
      id: providerPaymentId,
      status: "succeeded",
      paid: true,
      amount: {
        value: payment.amount.toFixed(2),
        currency: payment.currency,
      },
      metadata: {
        order_id: payment.orderId,
        order_number: payment.order.orderNumber,
      },
    },
  });

  return NextResponse.redirect(new URL(`/checkout/success?order=${encodeURIComponent(payment.orderId)}`, request.url));
}
