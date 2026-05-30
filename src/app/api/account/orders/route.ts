import { getCurrentUser } from "@/lib/server/auth";
import { orderFromDb } from "@/lib/server/account-mappers";
import { apiError, noStoreJson } from "@/lib/server/api";
import { dbOrderInclude } from "@/lib/server/catalog-db";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("unauthorized");
    }

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: dbOrderInclude,
      orderBy: { createdAt: "desc" },
    });

    return noStoreJson({ orders: orders.map(orderFromDb) });
  } catch (error) {
    return apiError(error, "Не удалось загрузить заказы.");
  }
}
