import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  CATALOG_CACHE_TAG,
  PUBLIC_CATALOG_REVALIDATE_SECONDS,
  readCatalogCollectionsFromDb,
  readCatalogProductsFromDb,
  replaceCatalogInDb,
} from "@/lib/server/catalog-db";
import { getCurrentUser } from "@/lib/server/auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { catalogPayloadSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

const PUBLIC_CATALOG_STALE_SECONDS = 24 * 60 * 60;

export async function GET() {
  try {
    const [products, collections] = await Promise.all([
      readCatalogProductsFromDb(),
      readCatalogCollectionsFromDb(),
    ]);
    return NextResponse.json(
      { products, collections },
      {
        headers: {
          "Cache-Control": [
            "public",
            `max-age=${PUBLIC_CATALOG_REVALIDATE_SECONDS}`,
            `s-maxage=${PUBLIC_CATALOG_REVALIDATE_SECONDS}`,
            `stale-while-revalidate=${PUBLIC_CATALOG_STALE_SECONDS}`,
          ].join(", "),
        },
      },
    );
  } catch {
    console.error("Failed to read catalog file.");
    return NextResponse.json({ error: "Не удалось загрузить каталог." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "catalog-put", {
      maxAttempts: 15,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много запросов. Повторите позже." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    assertSameOrigin(request);
    assertCsrfToken(request);
    const payload = catalogPayloadSchema.parse(await request.json());
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }

    await replaceCatalogInDb(payload.products, payload.collections);
    revalidateTag(CATALOG_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/catalog");
    revalidatePath("/new");
    revalidatePath("/sale");
    revalidatePath("/accessories");
    revalidatePath("/teams");
    revalidatePath("/pilots");
    revalidatePath("/legends");

    return NextResponse.json({
      ok: true,
      count: payload.products.length,
      collections: payload.collections.length,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "forbidden-origin" || error.message === "invalid-csrf") {
        return NextResponse.json({ error: "Недостаточно прав для выполнения операции." }, { status: 403 });
      }

      if ("issues" in error) {
        return NextResponse.json({ error: "Переданы некорректные данные каталога." }, { status: 400 });
      }
    }

    console.error("Failed to save catalog file.");
    return NextResponse.json({ error: "Не удалось сохранить каталог." }, { status: 500 });
  }
}
