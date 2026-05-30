import { NextRequest, NextResponse } from "next/server";

import {
  clearCheckoutAccessCookie,
  clearRoleCookie,
  clearSessionCookie,
  getCurrentSession,
} from "@/lib/server/auth";
import { apiError } from "@/lib/server/api";
import { prisma } from "@/lib/prisma";
import { assertProtectedMutation } from "@/lib/server/request-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    assertProtectedMutation(request);
    const session = await getCurrentSession();

    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }

    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    clearRoleCookie(response);
    clearCheckoutAccessCookie(response);
    return response;
  } catch (error) {
    return apiError(error, "Не удалось выйти из аккаунта.");
  }
}
