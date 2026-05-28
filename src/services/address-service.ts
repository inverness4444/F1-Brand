import type { AddressInput, UserAddress } from "@/lib/account-types";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { addressInputSchema, addressesSchema, userAddressSchema } from "@/lib/validation-schemas";

async function parseAddresses(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { addresses?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить адреса.");
  }

  return addressesSchema.parse(payload?.addresses ?? []);
}

async function parseAddress(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { address?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось сохранить адрес.");
  }

  return userAddressSchema.parse(payload?.address);
}

export const addressService = {
  async listByUser(_userId: string): Promise<UserAddress[]> {
    void _userId;
    const response = await fetch("/api/account/addresses", {
      cache: "no-store",
      credentials: "include",
    });

    if (response.status === 401) {
      return [];
    }

    return parseAddresses(response);
  },

  async getDefault(userId: string) {
    return (await this.listByUser(userId)).find((address) => address.isDefault) ?? null;
  },

  async create(_userId: string, input: AddressInput, isDefault = false) {
    void _userId;
    const response = await fetch("/api/account/addresses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        address: addressInputSchema.parse(input),
        isDefault,
      }),
    });

    return parseAddress(response);
  },

  async update(_userId: string, addressId: string, input: AddressInput, isDefault = false) {
    void _userId;
    const response = await fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        address: addressInputSchema.parse(input),
        isDefault,
      }),
    });

    return parseAddress(response);
  },

  async remove(_userId: string, addressId: string) {
    void _userId;
    const response = await fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
      method: "DELETE",
      headers: buildCsrfHeaders(),
      credentials: "include",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? "Не удалось удалить адрес.");
    }
  },

  async setDefault(_userId: string, addressId: string) {
    void _userId;
    const response = await fetch(`/api/account/addresses/${encodeURIComponent(addressId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ isDefault: true }),
    });

    return parseAddress(response);
  },
};
