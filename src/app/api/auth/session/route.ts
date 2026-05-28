import { getCurrentSession, toAuthSession, toAuthUser } from "@/lib/server/auth";
import { apiError, noStoreJson } from "@/lib/server/api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return noStoreJson({ user: null, session: null });
    }

    return noStoreJson({
      user: toAuthUser(session.user),
      session: toAuthSession(session),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && error instanceof Error && error.message.includes("DATABASE_URL")) {
      return noStoreJson({ user: null, session: null });
    }

    return apiError(error, "Не удалось проверить сессию.");
  }
}
