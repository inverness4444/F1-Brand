import { NextRequest, NextResponse } from "next/server";

import {
  ALLOWED_CATALOG_IMAGE_TYPES,
  MAX_CATALOG_IMAGE_BYTES,
  saveCatalogAsset,
} from "@/lib/server/catalog-assets";
import { requireAdminApiUser } from "@/lib/server/admin-auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-asset-upload", {
      maxAttempts: 60,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много загрузок. Повторите позже." },
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
    await requireAdminApiUser();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Выберите изображение." }, { status: 400 });
    }

    if (!ALLOWED_CATALOG_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Поддерживаются JPG, PNG, WebP и GIF." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_CATALOG_IMAGE_BYTES) {
      return NextResponse.json({ error: "Размер изображения должен быть не больше 8 МБ." }, { status: 400 });
    }

    const url = await saveCatalogAsset(file);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "unauthorized") {
        return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
      }

      if (error.message === "forbidden" || error.message === "forbidden-origin" || error.message === "invalid-csrf") {
        return NextResponse.json({ error: "Недостаточно прав для загрузки." }, { status: 403 });
      }
    }

    console.error("Failed to upload catalog asset.");
    return NextResponse.json({ error: "Не удалось загрузить изображение." }, { status: 500 });
  }
}
