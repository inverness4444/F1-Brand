import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { sanitizeIdentifier } from "@/lib/security-utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = sanitizeIdentifier(rawId, "");

  if (!id) {
    return NextResponse.json({ error: "Изображение не найдено." }, { status: 404 });
  }

  const asset = await prisma.catalogAsset.findUnique({
    where: { id },
    select: {
      data: true,
      mimeType: true,
      size: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Изображение не найдено." }, { status: 404 });
  }

  return new Response(asset.data, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(asset.size),
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
