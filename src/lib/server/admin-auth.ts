import "server-only";

import { getCurrentUser } from "@/lib/server/auth";

export async function requireAdminApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("unauthorized");
  }

  if (user.role !== "ADMIN") {
    throw new Error("forbidden");
  }

  return user;
}
