import crypto from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  deleteProductFromDb,
  readAdminCatalogProductsFromDb,
  readCatalogCollectionsFromDb,
  upsertProductFromCatalogPayload,
} from "@/lib/server/catalog-db";
import { getCurrentUser } from "@/lib/server/auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { productSchema } from "@/lib/validation-schemas";
import { sanitizeIdentifier } from "@/lib/security-utils";

export const runtime = "nodejs";

const adminProductPayloadSchema = z.union([
  z.object({
    product: productSchema,
  }),
  productSchema,
]);

async function requireAdminApi() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  return null;
}

function revalidateCatalogPaths(productSlug?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/catalog");
  revalidatePath("/new");
  revalidatePath("/sale");
  revalidatePath("/men");
  revalidatePath("/women");
  revalidatePath("/accessories");

  if (productSlug) {
    revalidatePath(`/product/${productSlug}`);
  }
}

export async function GET() {
  const authError = await requireAdminApi();

  if (authError) {
    return authError;
  }

  const [products, collections] = await Promise.all([
    readAdminCatalogProductsFromDb(),
    readCatalogCollectionsFromDb(),
  ]);

  return NextResponse.json(
    { products, collections },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-product-save", {
      maxAttempts: 30,
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

    const authError = await requireAdminApi();

    if (authError) {
      return authError;
    }

    const parsed = adminProductPayloadSchema.parse(await request.json());
    const product = "product" in parsed ? parsed.product : parsed;
    const productWithId = {
      ...product,
      id: product.id || `product-${crypto.randomUUID()}`,
      gallery: product.gallery.length > 0 ? product.gallery : [product.image],
    };
    const savedProduct = await upsertProductFromCatalogPayload(productWithId);
    const collections = await readCatalogCollectionsFromDb();

    revalidateCatalogPaths(savedProduct.slug);

    return NextResponse.json({
      ok: true,
      product: savedProduct,
      collections,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "forbidden-origin" || error.message === "invalid-csrf") {
        return NextResponse.json({ error: "Недостаточно прав для выполнения операции." }, { status: 403 });
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message ?? "Переданы некорректные данные товара.",
          issues: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error("Failed to save admin product.");
    return NextResponse.json({ error: "Не удалось сохранить товар." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-product-delete", {
      maxAttempts: 30,
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

    const authError = await requireAdminApi();

    if (authError) {
      return authError;
    }

    const productId = sanitizeIdentifier(request.nextUrl.searchParams.get("id") ?? "", "");

    if (!productId) {
      return NextResponse.json({ error: "Не передан ID товара." }, { status: 400 });
    }

    const deletedProduct = await deleteProductFromDb(productId);
    const collections = await readCatalogCollectionsFromDb();

    revalidateCatalogPaths(deletedProduct?.slug);

    return NextResponse.json({
      ok: true,
      deleted: Boolean(deletedProduct),
      collections,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "forbidden-origin" || error.message === "invalid-csrf") {
        return NextResponse.json({ error: "Недостаточно прав для выполнения операции." }, { status: 403 });
      }
    }

    console.error("Failed to delete admin product.");
    return NextResponse.json({ error: "Не удалось удалить товар." }, { status: 500 });
  }
}
