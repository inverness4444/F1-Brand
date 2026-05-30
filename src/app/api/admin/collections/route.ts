import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  deleteCollectionFromDb,
  readCatalogCollectionsFromDb,
} from "@/lib/server/catalog-db";
import { getCurrentUser } from "@/lib/server/auth";
import { assertCsrfToken, assertSameOrigin, enforceRateLimit } from "@/lib/server/request-security";
import { sanitizeIdentifier } from "@/lib/security-utils";

export const runtime = "nodejs";

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
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/catalog");
  revalidatePath("/new");
  revalidatePath("/sale");
  revalidatePath("/men");
  revalidatePath("/women");
  revalidatePath("/accessories");

  if (collectionSlug) {
    revalidatePath(`/collections/${collectionSlug}`);
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
    const collections = await readCatalogCollectionsFromDb();

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
