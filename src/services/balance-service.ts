import type { BalanceTransactionType, UserBalance } from "@/lib/account-types";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import { userBalancesSchema } from "@/lib/validation-schemas";
import { authService } from "@/services/auth-service";
import { balanceTransactionService } from "@/services/balance-transaction-service";

function readBalances() {
  return readStorage<UserBalance[]>(storageKeys.userBalances, [], userBalancesSchema);
}

function writeBalances(balances: UserBalance[], emit = true) {
  writeStorage(storageKeys.userBalances, balances, userBalancesSchema);

  if (emit) {
    emitStorageChange("balances");
  }
}

function getBalanceSnapshot(userId: string) {
  return readBalances().find((balance) => balance.userId === userId) ?? null;
}

export const balanceService = {
  getByUserId(userId: string) {
    authService.assertAuthorizedUserId(userId);
    return this.getByUserIdUnsafe(userId);
  },

  getByUserIdUnsafe(userId: string) {
    const existingBalance = getBalanceSnapshot(userId);
    return (
      existingBalance ?? {
        userId,
        amount: 0,
        updatedAt: new Date(0).toISOString(),
      }
    );
  },

  applyTransaction({
    userId,
    type,
    amount,
    certificateCode = null,
    orderId = null,
  }: {
    userId: string;
    type: BalanceTransactionType;
    amount: number;
    certificateCode?: string | null;
    orderId?: string | null;
  }) {
    authService.assertAuthorizedUserId(userId);

    const now = new Date().toISOString();
    const balances = readBalances();
    const currentBalance = balances.find((balance) => balance.userId === userId) ?? {
      userId,
      amount: 0,
      updatedAt: now,
    };
    const balanceBefore = currentBalance.amount;
    const balanceAfter = balanceBefore + Math.trunc(amount);

    if (balanceAfter < 0) {
      throw new Error("Недостаточно средств на балансе.");
    }

    const nextBalance: UserBalance = {
      userId,
      amount: balanceAfter,
      updatedAt: now,
    };

    const nextBalances = balances.some((balance) => balance.userId === userId)
      ? balances.map((balance) => (balance.userId === userId ? nextBalance : balance))
      : [nextBalance, ...balances];

    writeBalances(nextBalances, false);

    const transaction = balanceTransactionService.create(
      {
        userId,
        type,
        amount: Math.trunc(amount),
        balanceBefore,
        balanceAfter,
        certificateCode,
        orderId,
      },
      { emit: false },
    );

    emitStorageChange("balances");

    return {
      balance: nextBalance,
      transaction,
      balanceBefore,
      balanceAfter,
    };
  },
};
