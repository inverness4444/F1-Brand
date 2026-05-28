import { NextRequest, NextResponse } from "next/server";

import { handleYooKassaWebhook } from "@/lib/payments/yookassa";
import { prisma } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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
        value: (payment.amount / 100).toFixed(2),
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
