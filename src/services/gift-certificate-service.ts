import type { GiftCertificate, IssuedGiftCertificate, OrderItem } from "@/lib/account-types";
import { createEntityId } from "@/lib/account-utils";
import { emitStorageChange, readStorage, storageKeys, writeStorage } from "@/lib/browser-storage";
import {
  generateGiftCertificateCode,
  normalizeGiftCertificateCode,
  validateGiftCertificateCode,
} from "@/lib/gift-certificate-utils";
import { giftCertificatesSchema } from "@/lib/validation-schemas";
import { authService } from "@/services/auth-service";
import { balanceService } from "@/services/balance-service";
import { orderService } from "@/services/order-service";
import { runSerializedMutation } from "@/services/storage-service";

function readCertificates() {
  return readStorage<GiftCertificate[]>(storageKeys.giftCertificates, [], giftCertificatesSchema);
}

function writeCertificates(certificates: GiftCertificate[], emit = true) {
  writeStorage(storageKeys.giftCertificates, certificates, giftCertificatesSchema);

  if (emit) {
    emitStorageChange("giftCertificates");
  }
}

function refreshExpiredCertificates(certificates: GiftCertificate[]) {
  const now = Date.now();
  let hasChanges = false;

  const nextCertificates = certificates.map((certificate) => {
    if (
      certificate.status === "purchased" &&
      certificate.expiresAt &&
      new Date(certificate.expiresAt).getTime() <= now
    ) {
      hasChanges = true;
      return {
        ...certificate,
        status: "expired" as const,
      };
    }

    return certificate;
  });

  return {
    certificates: nextCertificates,
    hasChanges,
  };
}

function getResolvedCertificates() {
  const { certificates, hasChanges } = refreshExpiredCertificates(readCertificates());

  if (hasChanges) {
    writeCertificates(certificates, false);
  }

  return certificates;
}

export const giftCertificateService = {
  listAll() {
    return getResolvedCertificates().sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  },

  listByActivatedUser(userId: string) {
    authService.assertAuthorizedUserId(userId);
    return this.listAll()
      .filter((certificate) => certificate.activatedByUserId === userId)
      .sort((left, right) => new Date(right.activatedAt ?? right.createdAt).getTime() - new Date(left.activatedAt ?? left.createdAt).getTime());
  },

  listByPurchasedUser(userId: string) {
    authService.assertAuthorizedUserId(userId);
    return this.listAll().filter((certificate) => certificate.purchasedByUserId === userId);
  },

  listByOrder(orderId: string) {
    return this.listAll().filter((certificate) => certificate.orderId === orderId);
  },

  getByCode(rawCode: string) {
    const normalizedCode = normalizeGiftCertificateCode(rawCode);

    if (!validateGiftCertificateCode(normalizedCode)) {
      return null;
    }

    return this.listAll().find((certificate) => certificate.code === normalizedCode) ?? null;
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
    const existingCodes = new Set(this.listAll().map((certificate) => certificate.code));
    const now = new Date().toISOString();

    return items.flatMap((item) => {
      if (item.productKind !== "gift_certificate") {
        return [];
      }

      return Array.from({ length: item.quantity }, () => {
        const code = generateGiftCertificateCode(existingCodes);
        existingCodes.add(code);

        return {
          id: createEntityId("gift_certificate"),
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

  saveAll(certificates: GiftCertificate[], options: { emit?: boolean } = {}) {
    if (certificates.length === 0) {
      return [];
    }

    const nextCertificates = [...certificates, ...this.listAll()];
    writeCertificates(nextCertificates, options.emit ?? true);
    return certificates;
  },

  async activate(userId: string, rawCode: string) {
    authService.assertAuthorizedUserId(userId);

    const normalizedCode = normalizeGiftCertificateCode(rawCode);

    if (!validateGiftCertificateCode(normalizedCode)) {
      throw new Error("Код должен состоять ровно из 8 латинских букв.");
    }

    return runSerializedMutation("commerce-finance", async () => {
      const certificates = getResolvedCertificates();
      const certificateIndex = certificates.findIndex((certificate) => certificate.code === normalizedCode);

      if (certificateIndex === -1) {
        throw new Error("Сертификат не найден");
      }

      const currentCertificate = certificates[certificateIndex];

      if (currentCertificate.status === "activated") {
        throw new Error("Этот сертификат уже был активирован");
      }

      if (currentCertificate.status === "cancelled") {
        throw new Error("Сертификат отменён");
      }

      if (currentCertificate.status === "expired") {
        throw new Error("Срок действия сертификата истёк");
      }

      if (
        currentCertificate.expiresAt &&
        new Date(currentCertificate.expiresAt).getTime() <= Date.now()
      ) {
        const expiredCertificate: GiftCertificate = {
          ...currentCertificate,
          status: "expired",
        };
        const nextCertificates = certificates.map((certificate, index) =>
          index === certificateIndex ? expiredCertificate : certificate,
        );
        writeCertificates(nextCertificates, true);
        orderService.updateGiftCertificateSnapshot(expiredCertificate);
        throw new Error("Срок действия сертификата истёк");
      }

      const activatedCertificate: GiftCertificate = {
        ...currentCertificate,
        status: "activated",
        activatedByUserId: userId,
        activatedAt: new Date().toISOString(),
      };

      writeCertificates(
        certificates.map((certificate, index) => (index === certificateIndex ? activatedCertificate : certificate)),
        false,
      );

      const balanceResult = balanceService.applyTransaction({
        userId,
        type: "gift_certificate_activation",
        amount: activatedCertificate.amount,
        certificateCode: activatedCertificate.code,
        orderId: activatedCertificate.orderId,
      });

      emitStorageChange("giftCertificates");
      orderService.updateGiftCertificateSnapshot(activatedCertificate);

      return {
        certificate: activatedCertificate,
        balance: balanceResult.balance,
        transaction: balanceResult.transaction,
      };
    });
  },
};
