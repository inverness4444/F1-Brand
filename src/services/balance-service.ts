import type { BalanceTransactionType, UserBalance } from "@/lib/account-types";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { userBalanceSchema } from "@/lib/validation-schemas";

async function getBalancePayload() {
  const response = await fetch("/api/account/balance", {
    cache: "no-store",
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as
    | { balance?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить баланс.");
  }

  return userBalanceSchema.parse(payload?.balance);
}

export const balanceService = {
  async getByUserId(_userId: string): Promise<UserBalance> {
    void _userId;
    return getBalancePayload();
  },

  async getByUserIdUnsafe(userId: string): Promise<UserBalance> {
    try {
      return await getBalancePayload();
    } catch {
      return {
        userId,
        amount: 0,
        updatedAt: new Date(0).toISOString(),
      };
    }
  },

  async applyTransaction({
    userId,
    amount,
  }: {
    userId: string;
    type: BalanceTransactionType;
    amount: number;
    certificateCode?: string | null;
    orderId?: string | null;
  }) {
    const current = await this.getByUserIdUnsafe(userId);
    return {
      balance: current,
      transaction: null,
      balanceBefore: current.amount,
      balanceAfter: current.amount + amount,
    };
  },

  async activateGiftCard(code: string) {
    const response = await fetch("/api/account/balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { balance?: unknown; certificate?: unknown; error?: string }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error ?? "Не удалось активировать сертификат.");
    }

    return payload ?? {};
  },
};
