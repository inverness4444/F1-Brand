import type { BalanceTransaction } from "@/lib/account-types";
import { createEntityId } from "@/lib/account-utils";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { balanceTransactionsSchema } from "@/lib/validation-schemas";
import { authService } from "@/services/auth-service";

function readTransactions() {
  return readStorage<BalanceTransaction[]>(
    storageKeys.balanceTransactions,
    [],
    balanceTransactionsSchema,
  );
}

function writeTransactions(transactions: BalanceTransaction[], emit = true) {
  writeStorage(storageKeys.balanceTransactions, transactions, balanceTransactionsSchema);

  if (emit) {
    emitStorageChange("balances");
  }
}

export const balanceTransactionService = {
  listByUser(userId: string) {
    try {
      authService.assertAuthorizedUserId(userId);
    } catch {
      return [];
    }

    return readTransactions()
      .filter((transaction) => transaction.userId === userId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  },

  create(
    input: Omit<BalanceTransaction, "id" | "createdAt">,
    options: {
      emit?: boolean;
    } = {},
  ) {
    const transaction: BalanceTransaction = {
      ...input,
      id: createEntityId("balance_transaction"),
      createdAt: new Date().toISOString(),
    };

    writeTransactions([transaction, ...readTransactions()], options.emit ?? true);
    return transaction;
  },
};
