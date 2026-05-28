import type { FavoriteRecord } from "@/lib/account-types";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { favoritesSchema } from "@/lib/validation-schemas";

async function parseFavorites(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { favorites?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить избранное.");
  }

  return favoritesSchema.parse(payload?.favorites ?? []);
}

export const favoriteService = {
  async listByUser(_userId: string): Promise<FavoriteRecord[]> {
    void _userId;
    const response = await fetch("/api/account/favorites", {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 401) {
      return [];
    }

    return parseFavorites(response);
  },

  async getProductIds(userId: string) {
    return (await this.listByUser(userId)).map((favorite) => favorite.productId);
  },

  async isFavorite(userId: string, productId: string) {
    return (await this.listByUser(userId)).some((favorite) => favorite.productId === productId);
  },

  async toggle(_userId: string, productId: string) {
    void _userId;
    const response = await fetch("/api/account/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });
    const payload = (await response.json().catch(() => null)) as { active?: boolean; error?: string } | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось обновить избранное.");
    }

    return { active: Boolean(payload?.active) };
  },

  async remove(_userId: string, productId: string) {
    void _userId;
    const response = await fetch("/api/account/favorites", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ productId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Не удалось удалить товар из избранного.");
    }
  },
};
