import type { AuthUser, ProfilePayload, StoredUser } from "@/lib/account-types";
import { normalizeEmail } from "@/lib/account-utils";
import { profilePayloadSchema } from "@/lib/validation-schemas";
import { authService } from "@/services/auth-service";

function assertUser(user: StoredUser | null): asserts user is StoredUser {
  if (!user) {
    throw new Error("Пользователь не найден.");
  }
}

export const userService = {
  getById(userId: string) {
    return authService.findUserById(userId);
  },

  updateProfile(userId: string, payload: ProfilePayload): AuthUser {
    authService.assertAuthorizedUserId(userId);
    const currentUser = authService.findStoredUserById(userId);
    assertUser(currentUser);
    const normalizedPayload = profilePayloadSchema.parse(payload);

    const nextEmail = normalizeEmail(normalizedPayload.email);
    const users = authService.getUsers();
    const duplicatedUser = users.find(
      (user) => user.id !== userId && normalizeEmail(user.email) === nextEmail,
    );

    if (duplicatedUser) {
      throw new Error("Этот email уже используется.");
    }

    return authService.replaceStoredUser({
      ...currentUser,
      name: normalizedPayload.name,
      email: nextEmail,
      phone: normalizedPayload.phone,
      birthday: normalizedPayload.birthday || null,
      favoriteDriver: normalizedPayload.favoriteDriver || null,
      favoriteTeam: normalizedPayload.favoriteTeam || null,
      updatedAt: new Date().toISOString(),
    });
  },
};
