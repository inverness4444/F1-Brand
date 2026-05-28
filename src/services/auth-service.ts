import type {
  AuthSession,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
} from "@/lib/account-types";
import {
  authUserSchema,
  forgotPasswordPayloadSchema,
  loginPayloadSchema,
  registerPayloadSchema,
} from "@/lib/validation-schemas";
import { buildCsrfHeaders } from "@/lib/security-utils";

type AuthSnapshot = {
  currentUser: AuthUser | null;
  currentSession: AuthSession | null;
};

async function parseAuthResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { user?: unknown; session?: AuthSession; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось выполнить запрос.");
  }

  const user = payload?.user ? authUserSchema.parse(payload.user) : null;
  return {
    user,
    session: payload?.session ?? null,
  };
}

async function postAuth(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return parseAuthResponse(response);
}

export const authService = {
  async getAuthSnapshot(): Promise<AuthSnapshot> {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      return { currentUser: null, currentSession: null };
    }

    const { user, session } = await parseAuthResponse(response);
    return { currentUser: user, currentSession: session };
  },

  async register(payload: RegisterPayload) {
    const input = registerPayloadSchema.parse(payload);
    const { user, session } = await postAuth("/api/auth/register", input);

    if (!user || !session) {
      throw new Error("Не удалось создать аккаунт.");
    }

    return { user, session };
  },

  async login(payload: LoginPayload) {
    const input = loginPayloadSchema.parse(payload);
    const { user, session } = await postAuth("/api/auth/login", input);

    if (!user || !session) {
      throw new Error("Не удалось выполнить вход.");
    }

    return { user, session };
  },

  async logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: buildCsrfHeaders(),
      credentials: "include",
    });
  },

  async forgotPassword(payload: ForgotPasswordPayload) {
    forgotPasswordPayloadSchema.parse(payload);
    return true;
  },

  assertAuthorizedUserId(userId: string, currentUserId?: string | null) {
    if (!currentUserId || currentUserId !== userId) {
      throw new Error("Недостаточно прав.");
    }
  },
};
