import { NextRequest, NextResponse } from "next/server";

import { readCatalogProductsFromFile, writeCatalogProductsToFile } from "@/lib/server/catalog-file";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { catalogProductsPayloadSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await readCatalogProductsFromFile();
    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
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
    if (process.env.NODE_ENV === "production" && process.env.ENABLE_CATALOG_API_WRITES !== "true") {
      return NextResponse.json(
        { error: "Изменение каталога в production отключено без явного разрешения." },
        { status: 403 },
      );
    }

    const rateLimit = enforceRateLimit(request, "catalog-put", {
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
    const payload = catalogProductsPayloadSchema.parse(await request.json());
    await writeCatalogProductsToFile(payload.products);

    return NextResponse.json({
      ok: true,
      count: payload.products.length,
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
