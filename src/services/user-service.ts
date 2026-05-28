import type { AuthUser, ProfilePayload } from "@/lib/account-types";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { authUserSchema, profilePayloadSchema } from "@/lib/validation-schemas";

export const userService = {
  async getById(_userId: string) {
    void _userId;
    return null;
  },

  async updateProfile(_userId: string, payload: ProfilePayload): Promise<AuthUser> {
    void _userId;
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify(profilePayloadSchema.parse(payload)),
    });
    const responsePayload = (await response.json().catch(() => null)) as { user?: unknown; error?: string } | null;

    if (!response.ok) {
      throw new Error(responsePayload?.error ?? "Не удалось сохранить профиль.");
    }

    return authUserSchema.parse(responsePayload?.user);
  },
};
