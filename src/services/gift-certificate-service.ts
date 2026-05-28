import type { GiftCertificate, IssuedGiftCertificate, OrderItem } from "@/lib/account-types";
import {
  generateGiftCertificateCode,
  normalizeGiftCertificateCode,
  validateGiftCertificateCode,
} from "@/lib/gift-certificate-utils";
import { giftCertificateSchema, giftCertificatesSchema, userBalanceSchema } from "@/lib/validation-schemas";
import { balanceService } from "@/services/balance-service";

async function fetchBalancePayload() {
  const response = await fetch("/api/account/balance", {
    cache: "no-store",
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as
    | { activatedCertificates?: unknown; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось загрузить сертификаты.");
  }

  return payload ?? {};
}

export const giftCertificateService = {
  async listAll() {
    const payload = await fetchBalancePayload();
    return giftCertificatesSchema.parse(payload.activatedCertificates ?? []);
  },

  async listByActivatedUser(_userId: string) {
    void _userId;
    return this.listAll();
  },

  async listByPurchasedUser(_userId: string) {
    void _userId;
    return [];
  },

  async listByOrder(_orderId: string) {
    void _orderId;
    return [];
  },

  getByCode(_rawCode: string) {
    void _rawCode;
    return null;
  },

  toIssuedGiftCertificate(certificate: GiftCertificate): IssuedGiftCertificate {
    return {
      id: certificate.id,
      amount: certificate.amount,
      code: certificate.code,
      status: certificate.status,
      orderId: certificate.orderId,
      purchasedByUserId: certificate.purchasedByUserId,
      activatedByUserId: certificate.activatedByUserId,
      createdAt: certificate.createdAt,
      activatedAt: certificate.activatedAt,
      expiresAt: certificate.expiresAt,
    };
  },

  createDraftsForOrder({
    orderId,
    purchasedByUserId,
    items,
  }: {
    orderId: string;
    purchasedByUserId: string | null;
    items: OrderItem[];
  }) {
    const existingCodes = new Set<string>();
    const now = new Date().toISOString();

    return items.flatMap((item) => {
      if (item.productKind !== "gift_certificate") {
        return [];
      }

      return Array.from({ length: item.quantity }, () => {
        const code = generateGiftCertificateCode(existingCodes);
        existingCodes.add(code);

        return {
          id: code.toLowerCase(),
          amount: item.unitPrice,
          code,
          status: "purchased" as const,
          purchasedByUserId,
          activatedByUserId: null,
          orderId,
          createdAt: now,
          activatedAt: null,
          expiresAt: null,
        } satisfies GiftCertificate;
      });
    });
  },

  saveAll(certificates: GiftCertificate[]) {
    return certificates;
  },

  async activate(_userId: string, rawCode: string) {
    void _userId;
    const normalizedCode = normalizeGiftCertificateCode(rawCode);

    if (!validateGiftCertificateCode(normalizedCode)) {
      throw new Error("Код должен состоять ровно из 8 латинских букв.");
    }

    const payload = await balanceService.activateGiftCard(normalizedCode);

    return {
      certificate: giftCertificateSchema.parse(payload?.certificate),
      balance: userBalanceSchema.parse(payload?.balance),
      transaction: null,
    };
  },
};
