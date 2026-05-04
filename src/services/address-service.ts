import type { AddressInput, UserAddress } from "@/lib/account-types";
import { createEntityId } from "@/lib/account-utils";
import { addressInputSchema, addressesSchema } from "@/lib/validation-schemas";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { authService } from "@/services/auth-service";

function readAddresses() {
  return readStorage<UserAddress[]>(storageKeys.addresses, [], addressesSchema);
}

function writeAddresses(addresses: UserAddress[]) {
  writeStorage(storageKeys.addresses, addresses, addressesSchema);
  emitStorageChange("addresses");
}

function normalizeAddressInput(input: AddressInput) {
  return addressInputSchema.parse(input);
}

function validateAddressInput(input: AddressInput) {
  return normalizeAddressInput(input);
}

export const addressService = {
  listByUser(userId: string) {
    try {
      authService.assertAuthorizedUserId(userId);
    } catch {
      return [];
    }

    return readAddresses()
      .filter((address) => address.userId === userId)
      .sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
  },

  getDefault(userId: string) {
    return this.listByUser(userId).find((address) => address.isDefault) ?? null;
  },

  create(userId: string, input: AddressInput, isDefault = false) {
    authService.assertAuthorizedUserId(userId);
    const normalized = validateAddressInput(input);
    const now = new Date().toISOString();
    const currentAddresses = readAddresses();
    const userAddresses = currentAddresses.filter((address) => address.userId === userId);
    const shouldBeDefault = isDefault || userAddresses.length === 0;

    const nextAddresses = currentAddresses.map((address) =>
      shouldBeDefault && address.userId === userId ? { ...address, isDefault: false } : address,
    );

    const newAddress: UserAddress = {
      id: createEntityId("address"),
      userId,
      isDefault: shouldBeDefault,
      createdAt: now,
      updatedAt: now,
      ...normalized,
    };

    writeAddresses([newAddress, ...nextAddresses]);
    return newAddress;
  },

  update(userId: string, addressId: string, input: AddressInput, isDefault = false) {
    authService.assertAuthorizedUserId(userId);
    const normalized = validateAddressInput(input);
    const currentAddresses = readAddresses();
    const targetAddress = currentAddresses.find(
      (address) => address.id === addressId && address.userId === userId,
    );

    if (!targetAddress) {
      throw new Error("Адрес не найден.");
    }

    const shouldBeDefault = isDefault || targetAddress.isDefault;
    const nextAddresses = currentAddresses.map((address) => {
      if (address.userId !== userId) {
        return address;
      }

      if (shouldBeDefault && address.id !== addressId) {
        return { ...address, isDefault: false };
      }

      if (address.id !== addressId) {
        return address;
      }

      return {
        ...address,
        ...normalized,
        isDefault: shouldBeDefault,
        updatedAt: new Date().toISOString(),
      };
    });

    writeAddresses(nextAddresses);
    return nextAddresses.find((address) => address.id === addressId) ?? null;
  },

  remove(userId: string, addressId: string) {
    authService.assertAuthorizedUserId(userId);
    const currentAddresses = readAddresses();
    const removedAddress = currentAddresses.find(
      (address) => address.id === addressId && address.userId === userId,
    );

    if (!removedAddress) {
      return;
    }

    const filtered = currentAddresses.filter((address) => address.id !== addressId);
    const userAddresses = filtered.filter((address) => address.userId === userId);

    if (removedAddress.isDefault && userAddresses.length > 0) {
      const [firstAddress] = userAddresses;
      writeAddresses(
        filtered.map((address) =>
          address.id === firstAddress.id ? { ...address, isDefault: true } : address,
        ),
      );
      return;
    }

    writeAddresses(filtered);
  },

  setDefault(userId: string, addressId: string) {
    authService.assertAuthorizedUserId(userId);
    const currentAddresses = readAddresses();
    const targetAddress = currentAddresses.find(
      (address) => address.id === addressId && address.userId === userId,
    );

    if (!targetAddress) {
      throw new Error("Адрес не найден.");
    }

    const nextAddresses = currentAddresses.map((address) =>
      address.userId === userId
        ? { ...address, isDefault: address.id === addressId, updatedAt: new Date().toISOString() }
        : address,
    );

    writeAddresses(nextAddresses);
    return nextAddresses.find((address) => address.id === addressId) ?? null;
  },
};
