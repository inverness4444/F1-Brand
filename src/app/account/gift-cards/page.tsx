"use client";

import { CreditCard, Gift, History, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import type { BalanceTransaction, GiftCertificate, UserBalance } from "@/lib/account-types";
import { formatDateTime } from "@/lib/account-utils";
import { STORAGE_EVENT_NAME } from "@/lib/browser-storage";
import { normalizeGiftCertificateCode, validateGiftCertificateCode } from "@/lib/gift-certificate-utils";
import {
  balanceTransactionTypeLabelRu,
  giftCertificateStatusLabelRu,
} from "@/lib/storefront-text";
import { formatPrice } from "@/lib/utils";
import { balanceService } from "@/services/balance-service";
import { balanceTransactionService } from "@/services/balance-transaction-service";
import { giftCertificateService } from "@/services/gift-certificate-service";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";

export default function AccountGiftCardsPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const pushToast = useToastStore((state) => state.pushToast);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [activatedCertificates, setActivatedCertificates] = useState<GiftCertificate[]>([]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const refresh = () => {
      setBalance(balanceService.getByUserId(currentUser.id));
      setTransactions(balanceTransactionService.listByUser(currentUser.id));
      setActivatedCertificates(giftCertificateService.listByActivatedUser(currentUser.id));
    };

    refresh();

    const handleStorage = (event: Event) => {
      if (event instanceof CustomEvent) {
        const entity = (event.detail as { entity?: string } | undefined)?.entity;

        if (entity && !["balances", "giftCertificates", "orders"].includes(entity)) {
          return;
        }
      }

      refresh();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STORAGE_EVENT_NAME, handleStorage as EventListener);
    };
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  const handleActivate = async () => {
    const normalizedCode = normalizeGiftCertificateCode(code);

    if (!validateGiftCertificateCode(normalizedCode)) {
      setError("Код должен состоять ровно из 8 латинских букв.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await giftCertificateService.activate(currentUser.id, normalizedCode);
      setCode("");
      setBalance(result.balance);
      setTransactions(balanceTransactionService.listByUser(currentUser.id));
      setActivatedCertificates(giftCertificateService.listByActivatedUser(currentUser.id));
      pushToast(`Сертификат активирован. На баланс начислено ${formatPrice(result.certificate.amount)}.`);
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : "Не удалось активировать сертификат.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <p className="section-kicker">Баланс и сертификаты</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Баланс и подарочные сертификаты</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
          Активируйте цифровой код, пополняйте баланс аккаунта и отслеживайте все операции в одном разделе.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-panel p-5">
          <div className="flex items-center gap-3">
            <Wallet className="size-5 text-slate-900" />
            <p className="text-sm text-slate-500">Текущий баланс</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{formatPrice(balance?.amount ?? 0)}</p>
        </div>
        <div className="card-panel p-5">
          <div className="flex items-center gap-3">
            <Gift className="size-5 text-slate-900" />
            <p className="text-sm text-slate-500">Активировано сертификатов</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{activatedCertificates.length}</p>
        </div>
        <div className="card-panel p-5">
          <div className="flex items-center gap-3">
            <History className="size-5 text-slate-900" />
            <p className="text-sm text-slate-500">Операций по балансу</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-slate-900">{transactions.length}</p>
        </div>
      </div>

      <div className="card-panel p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-1 size-5 text-[#7b2220]" />
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900">Активировать сертификат</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Введите код из 8 заглавных латинских букв. Код можно активировать только один раз и только на один аккаунт.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={code}
                onChange={(event) => setCode(normalizeGiftCertificateCode(event.target.value))}
                placeholder="Например, XQPLMNZA"
                maxLength={8}
                className={`field-base flex-1 ${error ? "border-red-300 focus:border-red-400" : ""}`}
              />
              <Button className="rounded-2xl" onClick={() => void handleActivate()} disabled={isSubmitting}>
                {isSubmitting ? "Активируем..." : "Активировать"}
              </Button>
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="card-panel p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">История активированных сертификатов</h3>
          {activatedCertificates.length > 0 ? (
            <div className="mt-5 space-y-4">
              {activatedCertificates.map((certificate) => (
                <div key={certificate.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-mono text-lg font-semibold tracking-[0.18em] text-slate-900">
                        {certificate.code}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Активирован {certificate.activatedAt ? formatDateTime(certificate.activatedAt) : "только что"}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-slate-900">{formatPrice(certificate.amount)}</p>
                      <p className="mt-2 text-sm text-slate-500">
                        {giftCertificateStatusLabelRu[certificate.status]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Активированных сертификатов пока нет. После первой активации здесь появится история кодов.
            </p>
          )}
        </div>

        <div className="card-panel p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-slate-900">История операций баланса</h3>
          {transactions.length > 0 ? (
            <div className="mt-5 space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {balanceTransactionTypeLabelRu[transaction.type]}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{formatDateTime(transaction.createdAt)}</p>
                      {transaction.orderId ? (
                        <p className="mt-2 text-sm text-slate-500">Связанный заказ: {transaction.orderId}</p>
                      ) : null}
                      {transaction.certificateCode ? (
                        <p className="mt-1 font-mono text-sm tracking-[0.16em] text-slate-900">
                          {transaction.certificateCode}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left sm:text-right">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.amount >= 0 ? "text-emerald-700" : "text-[#7b2220]"
                        }`}
                      >
                        {transaction.amount >= 0 ? "+" : "−"} {formatPrice(Math.abs(transaction.amount))}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Остаток: {formatPrice(transaction.balanceAfter)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Операций по балансу пока нет. Активация сертификатов и оплата заказов появятся в этой истории автоматически.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
