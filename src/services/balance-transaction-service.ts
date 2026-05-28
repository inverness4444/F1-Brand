import type { BalanceTransaction } from "@/lib/account-types";
import { balanceTransactionsSchema } from "@/lib/validation-schemas";

async function fetchBalancePayload() {
  const response = await fetch("/api/account/balance", {
    cache: "no-store",
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as
    | { transactions?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить операции баланса.");
  }

  return payload ?? {};
}

export const balanceTransactionService = {
  async listByUser(_userId: string): Promise<BalanceTransaction[]> {
    void _userId;
    const payload = await fetchBalancePayload();
    return balanceTransactionsSchema.parse(payload.transactions ?? []);
  },

  create(input: Omit<BalanceTransaction, "id" | "createdAt">) {
    return {
      ...input,
      id: "",
      createdAt: new Date().toISOString(),
    };
  },
};
