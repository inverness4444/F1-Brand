function sanitizeAmount(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function calculateBalanceUsage({
  total,
  availableBalance,
  requestedAmount,
}: {
  total: number;
  availableBalance: number;
  requestedAmount?: number | null;
}) {
  const safeTotal = sanitizeAmount(total);
  const safeBalance = sanitizeAmount(availableBalance);
  const preferredAmount =
    typeof requestedAmount === "number" && Number.isFinite(requestedAmount)
      ? sanitizeAmount(requestedAmount)
      : safeBalance;
  const amountPaidByBalance = Math.min(safeTotal, safeBalance, preferredAmount);
  const amountToPay = safeTotal - amountPaidByBalance;
  const balanceAfter = safeBalance - amountPaidByBalance;

  return {
    availableBalance: safeBalance,
    amountPaidByBalance,
    amountToPay,
    balanceAfter,
    usedBalance: amountPaidByBalance > 0,
  };
}
