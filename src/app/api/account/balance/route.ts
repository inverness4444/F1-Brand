import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { normalizeGiftCertificateCode, validateGiftCertificateCode } from "@/lib/gift-certificate-utils";
import { getCurrentUser } from "@/lib/server/auth";
import { balanceFromDb, balanceTransactionFromDb, giftCardFromDb } from "@/lib/server/account-mappers";
import { apiError, noStoreJson } from "@/lib/server/api";
import { prisma } from "@/lib/prisma";
import { assertProtectedMutation, enforceRateLimit } from "@/lib/server/request-security";

export const runtime = "nodejs";

const activateSchema = z.object({
  code: z.string().transform(normalizeGiftCertificateCode).refine(validateGiftCertificateCode),
});

async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireApiUser();
    const [balance, transactions, activatedCertificates] = await Promise.all([
      prisma.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, amountCents: 0 },
        update: {},
      }),
      prisma.balanceTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.giftCard.findMany({
        where: { redeemedByUserId: user.id },
        orderBy: { redeemedAt: "desc" },
      }),
    ]);

    return noStoreJson({
      balance: balanceFromDb(balance),
      transactions: transactions.map(balanceTransactionFromDb),
      activatedCertificates: activatedCertificates.map(giftCardFromDb),
    });
  } catch (error) {
    return apiError(error, "Не удалось загрузить баланс.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, "account-gift-card-activate", {
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток активации. Повторите позже." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    assertProtectedMutation(request);
    const user = await requireApiUser();
    const input = activateSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const certificate = await tx.giftCard.findUnique({
        where: { code: input.code },
      });

      if (!certificate || certificate.status !== "ACTIVE") {
        throw new Error("Сертификат не найден или уже активирован.");
      }

      const currentBalance = await tx.userBalance.upsert({
        where: { userId: user.id },
        create: { userId: user.id, amountCents: 0 },
        update: {},
      });
      const balanceBefore = currentBalance.amountCents;
      const balanceAfter = balanceBefore + certificate.amountCents;

      const [updatedBalance, transaction, updatedCertificate] = await Promise.all([
        tx.userBalance.update({
          where: { userId: user.id },
          data: { amountCents: balanceAfter },
        }),
        tx.balanceTransaction.create({
          data: {
            userId: user.id,
            type: "gift_certificate_activation",
            amountCents: certificate.amountCents,
            balanceBeforeCents: balanceBefore,
            balanceAfterCents: balanceAfter,
            certificateCode: certificate.code,
            orderId: certificate.orderId,
          },
        }),
        tx.giftCard.update({
          where: { id: certificate.id },
          data: {
            status: "REDEEMED",
            redeemedByUserId: user.id,
            redeemedAt: new Date(),
          },
        }),
      ]);

      return { updatedBalance, transaction, updatedCertificate };
    });

    return NextResponse.json({
      balance: balanceFromDb(result.updatedBalance),
      transaction: balanceTransactionFromDb(result.transaction),
      certificate: giftCardFromDb(result.updatedCertificate),
    });
  } catch (error) {
    return apiError(error, "Не удалось активировать сертификат.");
  }
}
