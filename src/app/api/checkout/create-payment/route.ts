import { NextRequest, NextResponse } from "next/server";

import { createCheckoutPayment } from "@/lib/server/checkout-payment";
import { getCurrentUser } from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { assertSameOrigin } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const [payload, currentUser] = await Promise.all([request.json(), getCurrentUser()]);
    const result = await createCheckoutPayment(payload, request.url, currentUser);

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, "Не удалось подготовить оплату.");
  }
}
