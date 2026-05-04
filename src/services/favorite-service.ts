import type { FavoriteRecord } from "@/lib/account-types";
import { createEntityId } from "@/lib/account-utils";
import { favoritesSchema } from "@/lib/validation-schemas";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { authService } from "@/services/auth-service";

function readFavorites() {
  return readStorage<FavoriteRecord[]>(storageKeys.favorites, [], favoritesSchema);
}

function writeFavorites(favorites: FavoriteRecord[]) {
  writeStorage(storageKeys.favorites, favorites, favoritesSchema);
  emitStorageChange("favorites");
}

export const favoriteService = {
  listByUser(userId: string) {
    try {
      authService.assertAuthorizedUserId(userId);
    } catch {
      return [];
    }

    return readFavorites().filter((favorite) => favorite.userId === userId);
  },

  getProductIds(userId: string) {
    return this.listByUser(userId).map((favorite) => favorite.productId);
  },

  isFavorite(userId: string, productId: string) {
    return this.listByUser(userId).some((favorite) => favorite.productId === productId);
  },

  toggle(userId: string, productId: string) {
    authService.assertAuthorizedUserId(userId);
    const favorites = readFavorites();
    const existingFavorite = favorites.find(
      (favorite) => favorite.userId === userId && favorite.productId === productId,
    );

    if (existingFavorite) {
      writeFavorites(favorites.filter((favorite) => favorite.id !== existingFavorite.id));
      return { active: false };
    }

    writeFavorites([
      {
        id: createEntityId("favorite"),
        userId,
        productId,
        createdAt: new Date().toISOString(),
      },
      ...favorites,
    ]);
    return { active: true };
  },

  remove(userId: string, productId: string) {
    authService.assertAuthorizedUserId(userId);
    writeFavorites(
      readFavorites().filter(
        (favorite) => !(favorite.userId === userId && favorite.productId === productId),
      ),
    );
  },
};
