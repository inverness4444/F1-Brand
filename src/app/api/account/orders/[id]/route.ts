import { NextRequest } from "next/server";

import { CHECKOUT_ACCESS_COOKIE_NAME } from "@/lib/cookie-constants";
import { getCurrentUser, verifyCheckoutAccessCookieValue } from "@/lib/server/auth";
import { orderFromDb } from "@/lib/server/account-mappers";
import { apiError, noStoreJson } from "@/lib/server/api";
import { dbOrderInclude } from "@/lib/server/catalog-db";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const [{ id }, user] = await Promise.all([context.params, getCurrentUser()]);
    const allowGuestCheckoutLookup = request.nextUrl.searchParams.get("checkout") === "1";
    const order = await prisma.order.findUnique({
      where: { id },
      include: dbOrderInclude,
    });

    if (!order) {
      return noStoreJson({ order: null }, { status: 404 });
    }

    if (order.userId) {
      if (!user || order.userId !== user.id) {
        throw new Error("forbidden");
      }
    } else {
      const checkoutAccessCookie = request.cookies.get(CHECKOUT_ACCESS_COOKIE_NAME)?.value;
      const hasCheckoutAccess =
        allowGuestCheckoutLookup && verifyCheckoutAccessCookieValue(checkoutAccessCookie, id);

      if (!hasCheckoutAccess) {
        throw new Error("forbidden");
      }
    }

    return noStoreJson({ order: orderFromDb(order) });
  } catch (error) {
    return apiError(error, "Не удалось загрузить заказ.");
  }
}
