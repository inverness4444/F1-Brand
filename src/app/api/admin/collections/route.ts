import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/server/api";
import {
  CATALOG_CACHE_TAG,
  deleteCollectionFromDb,
  readAdminCatalogProductsFromDb,
  readCatalogCollectionsFromDb,
  upsertCollectionFromCatalogPayload,
} from "@/lib/server/catalog-db";
import { getCurrentUser } from "@/lib/server/auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { sanitizeIdentifier } from "@/lib/security-utils";
import { catalogCollectionSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

const adminCollectionSaveSchema = z.object({
  collection: catalogCollectionSchema,
  productIds: z.array(z.string().transform((value) => sanitizeIdentifier(value, ""))).max(500).optional(),
});

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

function revalidateCatalogPaths(collectionSlug?: string) {
  revalidateTag(CATALOG_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/catalog");
  revalidatePath("/new");
  revalidatePath("/sale");
  revalidatePath("/men");
  revalidatePath("/women");
  revalidatePath("/accessories");
  revalidatePath("/teams");
  revalidatePath("/pilots");
  revalidatePath("/legends");

  if (collectionSlug) {
    revalidatePath(`/collections/${collectionSlug}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-collection-save", {
      maxAttempts: 50,
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

    const input = adminCollectionSaveSchema.parse(await request.json());
    const result = await upsertCollectionFromCatalogPayload(
      input.collection,
      input.productIds ?? input.collection.productIds,
    );
    const [products, collections] = await Promise.all([
      readAdminCatalogProductsFromDb(),
      readCatalogCollectionsFromDb({ includeHidden: true }),
    ]);

    revalidateCatalogPaths(result.previousSlug);

    if (result.collection.slug !== result.previousSlug) {
      revalidatePath(`/collections/${result.collection.slug}`);
    }

    return NextResponse.json({
      ok: true,
      collection: result.collection,
      products,
      collections,
    });
  } catch (error) {
    return apiError(error, "Не удалось сохранить коллекцию.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "admin-collection-delete", {
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

    const collectionId = sanitizeIdentifier(request.nextUrl.searchParams.get("id") ?? "", "");

    if (!collectionId) {
      return NextResponse.json({ error: "Не передан ID коллекции." }, { status: 400 });
    }

    const deletedCollection = await deleteCollectionFromDb(collectionId);
    const collections = await readCatalogCollectionsFromDb({ includeHidden: true });

    revalidateCatalogPaths(deletedCollection?.slug);

    return NextResponse.json({
      ok: true,
      deleted: Boolean(deletedCollection),
      collections,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "forbidden-origin" || error.message === "invalid-csrf") {
        return NextResponse.json({ error: "Недостаточно прав для выполнения операции." }, { status: 403 });
      }
    }

    console.error("Failed to delete admin collection.");
    return NextResponse.json({ error: "Не удалось удалить коллекцию." }, { status: 500 });
  }
}
