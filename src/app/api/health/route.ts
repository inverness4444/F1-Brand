import { NextResponse } from "next/server";

import { isDatabaseConfigured, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const checkedAt = new Date().toISOString();

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        checkedAt,
        services: {
          database: "not_configured",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        checkedAt,
        services: {
          database: "ok",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        checkedAt,
        services: {
          database: "unavailable",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
