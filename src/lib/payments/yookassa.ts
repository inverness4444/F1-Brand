import "server-only";

import crypto from "node:crypto";

import type { PaymentStatus, Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  deductStockForPaidOrder,
  issueGiftCertificatesForPaidOrder,
  refundOrderBalancePayment,
} from "@/lib/server/order-fulfillment";
import { recordAnalyticsEvent } from "@/lib/server/analytics";
import { notifyOrderPaidOnSite } from "@/lib/server/notifications";

const YOOKASSA_API_BASE_URL = "https://api.yookassa.ru/v3";
const DEFAULT_CURRENCY = "RUB";
const DEFAULT_RECEIPT_VAT_CODE = 1;
const DEFAULT_RECEIPT_PAYMENT_SUBJECT = "commodity";
const DEFAULT_RECEIPT_PAYMENT_MODE = "full_prepayment";
const DEFAULT_RECEIPT_MEASURE = "piece";

type JsonRecord = Record<string, unknown>;

type YooKassaAmount = {
  value: string;
  currency: string;
};

export type YooKassaReceiptItem = {
  description: string;
  quantity: number;
  amount: YooKassaAmount;
  vat_code?: number;
  payment_subject?: string;
  payment_mode?: string;
  measure?: string;
};

export type YooKassaReceipt = {
  customer: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  items: YooKassaReceiptItem[];
  tax_system_code?: number;
};

export type YooKassaPaymentResult = {
  providerPaymentId: string | null;
  status: PaymentStatus;
  confirmationUrl: string | null;
  rawRequest: Prisma.InputJsonValue;
  rawResponse: Prisma.InputJsonValue;
};

export type CreateYooKassaPaymentInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency?: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
  idempotenceKey: string;
  returnUrl: string;
  receipt?: YooKassaReceipt | null;
  receiptRequired?: boolean;
};

export type YooKassaRefundInput = {
  paymentId: string;
  providerPaymentId: string;
  amount: number;
  currency?: string;
  idempotenceKey: string;
  reason?: string | null;
};

class YooKassaApiError extends Error {
  code: string;
  rawResponse: Prisma.InputJsonValue | null;

  constructor(message: string, code: string, rawResponse: Prisma.InputJsonValue | null) {
    super(message);
    this.name = "YooKassaApiError";
    this.code = code;
    this.rawResponse = rawResponse;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toMoneyValue(amount: number) {
  return amount.toFixed(2);
}

function parseOptionalInteger(value: string | undefined, min: number, max: number) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function amountToStoreAmount(amount: unknown) {
  if (!isRecord(amount) || typeof amount.value !== "string") {
    return 0;
  }

  return Math.round(Number.parseFloat(amount.value));
}

function amountCurrency(amount: unknown) {
  if (!isRecord(amount) || typeof amount.currency !== "string") {
    return null;
  }

  return amount.currency;
}

function metadataOrderId(object: JsonRecord) {
  const metadata = isRecord(object.metadata) ? object.metadata : null;
  return typeof metadata?.order_id === "string" ? metadata.order_id : null;
}

function getAppUrl() {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.AUTH_URL ??
    "https://velocityclub.ru"
  ).replace(/\/+$/, "");
}

function hasRealYooKassaCredentials() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();

  return Boolean(
    shopId &&
      secretKey &&
      shopId !== "replace-with-yookassa-shop-id" &&
      secretKey !== "replace-with-yookassa-secret-key",
  );
}

function mockPaymentsEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_MOCK_PAYMENTS === "true";
}

function assertPaymentProviderConfigured() {
  if (hasRealYooKassaCredentials() || mockPaymentsEnabled()) {
    return;
  }

  throw new Error("Платёжный провайдер не настроен для production.");
}

export function getYooKassaProviderMode() {
  assertPaymentProviderConfigured();
  return hasRealYooKassaCredentials() ? "YOOKASSA" : "MOCK";
}

function getAuthHeader() {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secretKey = process.env.YOOKASSA_SECRET_KEY?.trim();

  if (!shopId || !secretKey) {
    throw new Error("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required for real YooKassa requests.");
  }

  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`;
}

function mapYooKassaPaymentStatus(status: unknown): PaymentStatus {
  switch (status) {
    case "pending":
      return "PENDING";
    case "waiting_for_capture":
      return "WAITING_FOR_CAPTURE";
    case "succeeded":
      return "SUCCEEDED";
    case "canceled":
      return "CANCELED";
    default:
      return "FAILED";
  }
}

function mapRefundStatus(status: unknown) {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED" as const;
    case "canceled":
      return "CANCELED" as const;
    case "pending":
      return "PENDING" as const;
    default:
      return "FAILED" as const;
  }
}

function buildPaymentRequest(input: CreateYooKassaPaymentInput) {
  const currency = input.currency ?? DEFAULT_CURRENCY;
  const body: JsonRecord = {
    amount: {
      value: toMoneyValue(input.amount),
      currency,
    },
    capture: true,
    confirmation: {
      type: "redirect",
      return_url: input.returnUrl,
    },
    description: `Заказ ${input.orderNumber}`,
    metadata: {
      order_id: input.orderId,
      order_number: input.orderNumber,
    },
  };

  if (input.receiptRequired && input.receipt) {
    body.receipt = input.receipt;
  }

  return body;
}

async function yooKassaRequest<TPayload extends JsonRecord>(
  path: string,
  options: {
    method: "GET" | "POST";
    idempotenceKey?: string;
    body?: JsonRecord;
  },
) {
  const response = await fetch(`${YOOKASSA_API_BASE_URL}${path}`, {
    method: options.method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.idempotenceKey ? { "Idempotence-Key": options.idempotenceKey } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as TPayload | null;

  if (!response.ok) {
    const code = isRecord(payload) && typeof payload.type === "string" ? payload.type : `HTTP_${response.status}`;
    const message = isRecord(payload) && typeof payload.description === "string"
      ? payload.description
      : "YooKassa request failed.";
    throw new YooKassaApiError(message, code, payload ? toJson(payload) : null);
  }

  if (!payload) {
    throw new YooKassaApiError("YooKassa returned an empty response.", "EMPTY_RESPONSE", null);
  }

  return payload;
}

export function buildYooKassaReceipt(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    paymentSubject?: string;
    measure?: string;
  }>;
  currency?: string;
}): YooKassaReceipt {
  const vatCode = parseOptionalInteger(process.env.YOOKASSA_VAT_CODE, 1, 12) ?? DEFAULT_RECEIPT_VAT_CODE;
  const taxSystemCode = parseOptionalInteger(process.env.YOOKASSA_TAX_SYSTEM_CODE, 1, 6);
  const paymentSubject = process.env.YOOKASSA_PAYMENT_SUBJECT?.trim() || DEFAULT_RECEIPT_PAYMENT_SUBJECT;
  const paymentMode = process.env.YOOKASSA_PAYMENT_MODE?.trim() || DEFAULT_RECEIPT_PAYMENT_MODE;
  const currency = input.currency ?? DEFAULT_CURRENCY;

  return {
    customer: {
      full_name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone.replace(/[^\d]/g, ""),
    },
    items: input.items.map((item) => ({
      description: item.name.slice(0, 128),
      quantity: Number(item.quantity.toFixed(3)),
      amount: {
        value: toMoneyValue(item.unitPrice),
        currency,
      },
      vat_code: vatCode,
      payment_subject: item.paymentSubject ?? paymentSubject,
      payment_mode: paymentMode,
      measure: item.measure ?? DEFAULT_RECEIPT_MEASURE,
    })),
    ...(taxSystemCode ? { tax_system_code: taxSystemCode } : {}),
  };
}

export async function createYooKassaPayment(input: CreateYooKassaPaymentInput): Promise<YooKassaPaymentResult> {
  const requestBody = buildPaymentRequest(input);

  if (!hasRealYooKassaCredentials()) {
    assertPaymentProviderConfigured();
    const providerPaymentId = `mock_${crypto.randomUUID()}`;
    const confirmationUrl = `${getAppUrl()}/api/payments/yookassa/mock/confirm?paymentId=${encodeURIComponent(
      providerPaymentId,
    )}`;
    const response = {
      id: providerPaymentId,
      status: "pending",
      paid: false,
      amount: requestBody.amount,
      confirmation: {
        type: "redirect",
        confirmation_url: confirmationUrl,
      },
      metadata: requestBody.metadata,
      test: true,
    };

    return {
      providerPaymentId,
      status: "PENDING",
      confirmationUrl,
      rawRequest: toJson(requestBody),
      rawResponse: toJson(response),
    };
  }

  // TODO: Replace direct fetch with the official YooKassa SDK if the project standardizes on it.
  const response = await yooKassaRequest<JsonRecord>("/payments", {
    method: "POST",
    idempotenceKey: input.idempotenceKey,
    body: requestBody,
  });
  const confirmation = isRecord(response.confirmation) ? response.confirmation : null;

  return {
    providerPaymentId: typeof response.id === "string" ? response.id : null,
    status: mapYooKassaPaymentStatus(response.status),
    confirmationUrl: typeof confirmation?.confirmation_url === "string" ? confirmation.confirmation_url : null,
    rawRequest: toJson(requestBody),
    rawResponse: toJson(response),
  };
}

export async function getYooKassaPayment(providerPaymentId: string) {
  if (!hasRealYooKassaCredentials()) {
    return prisma.payment.findFirst({
      where: { providerPaymentId },
    });
  }

  return yooKassaRequest<JsonRecord>(`/payments/${encodeURIComponent(providerPaymentId)}`, {
    method: "GET",
  });
}

export async function cancelYooKassaPayment(providerPaymentId: string, idempotenceKey = crypto.randomUUID()) {
  if (!hasRealYooKassaCredentials()) {
    return {
      id: providerPaymentId,
      status: "canceled",
      canceled_at: new Date().toISOString(),
    };
  }

  return yooKassaRequest<JsonRecord>(`/payments/${encodeURIComponent(providerPaymentId)}/cancel`, {
    method: "POST",
    idempotenceKey,
    body: {},
  });
}

export async function captureYooKassaPayment(input: {
  providerPaymentId: string;
  amount?: number;
  currency?: string;
  idempotenceKey?: string;
}) {
  const body = input.amount
    ? {
        amount: {
          value: toMoneyValue(input.amount),
          currency: input.currency ?? DEFAULT_CURRENCY,
        },
      }
    : {};

  if (!hasRealYooKassaCredentials()) {
    return {
      id: input.providerPaymentId,
      status: "succeeded",
      captured_at: new Date().toISOString(),
      ...body,
    };
  }

  return yooKassaRequest<JsonRecord>(`/payments/${encodeURIComponent(input.providerPaymentId)}/capture`, {
    method: "POST",
    idempotenceKey: input.idempotenceKey ?? crypto.randomUUID(),
    body,
  });
}

export async function createYooKassaRefund(input: YooKassaRefundInput) {
  const body = {
    payment_id: input.providerPaymentId,
    amount: {
      value: toMoneyValue(input.amount),
      currency: input.currency ?? DEFAULT_CURRENCY,
    },
    ...(input.reason ? { description: input.reason } : {}),
  };

  if (!hasRealYooKassaCredentials()) {
    return {
      id: `mock_refund_${crypto.randomUUID()}`,
      payment_id: input.providerPaymentId,
      status: "succeeded",
      amount: body.amount,
      description: input.reason ?? null,
    };
  }

  return yooKassaRequest<JsonRecord>("/refunds", {
    method: "POST",
    idempotenceKey: input.idempotenceKey,
    body,
  });
}

function normalizeWebhook(payload: unknown) {
  const record = isRecord(payload) ? payload : {};
  const object = isRecord(record.object) ? record.object : {};
  const eventType = typeof record.event === "string" ? record.event : "unknown";
  const eventId = typeof record.id === "string" ? record.id : null;
  const objectId = typeof object.id === "string" ? object.id : null;
  const objectStatus = typeof object.status === "string" ? object.status : null;
  const dedupeSource = eventId ?? `${eventType}:${objectId ?? "missing-object"}:${objectStatus ?? "missing-status"}`;
  const dedupeKey = crypto.createHash("sha256").update(dedupeSource).digest("hex");

  return {
    eventId,
    eventType,
    object,
    objectId,
    objectStatus,
    dedupeKey,
    payloadJson: toJson(record),
  };
}

function paymentDateUpdates(status: PaymentStatus, object: JsonRecord) {
  const now = new Date();
  const capturedAt = typeof object.captured_at === "string" ? new Date(object.captured_at) : now;
  const canceledAt = typeof object.canceled_at === "string" ? new Date(object.canceled_at) : now;

  return {
    ...(status === "SUCCEEDED" ? { paidAt: now, capturedAt } : {}),
    ...(status === "WAITING_FOR_CAPTURE" ? { paidAt: now } : {}),
    ...(status === "CANCELED" ? { canceledAt } : {}),
  };
}

export async function handleYooKassaWebhook(payload: unknown) {
  const normalized = normalizeWebhook(payload);
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { dedupeKey: normalized.dedupeKey },
  });

  if (existingEvent?.processed) {
    return { processed: false, duplicate: true, eventId: existingEvent.id };
  }

  const webhookEvent =
    existingEvent ??
    (await prisma.webhookEvent.create({
      data: {
        provider: "YOOKASSA",
        eventId: normalized.eventId,
        dedupeKey: normalized.dedupeKey,
        eventType: normalized.eventType,
        payload: normalized.payloadJson,
      },
    }));

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        if (normalized.eventType.startsWith("payment.")) {
          if (!normalized.objectId) {
            throw new Error("Webhook payload does not contain payment id.");
          }

          const payment = await tx.payment.findFirst({
            where: { providerPaymentId: normalized.objectId },
            include: { order: true },
          });

          if (!payment) {
            throw new Error(`Payment ${normalized.objectId} was not found.`);
          }

          const webhookAmount = amountToStoreAmount(normalized.object.amount);
          const webhookCurrency = amountCurrency(normalized.object.amount);
          const webhookOrderId = metadataOrderId(normalized.object);

          if (webhookAmount > 0 && webhookAmount !== payment.amount) {
            throw new Error("Webhook payment amount does not match the stored payment amount.");
          }

          if (webhookCurrency && webhookCurrency !== payment.currency) {
            throw new Error("Webhook payment currency does not match the stored payment currency.");
          }

          if (webhookOrderId && webhookOrderId !== payment.orderId) {
            throw new Error("Webhook payment order metadata does not match the stored order.");
          }

          const status = mapYooKassaPaymentStatus(normalized.objectStatus);

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status,
              webhookPayload: normalized.payloadJson,
              rawResponse: normalized.payloadJson,
              errorCode: null,
              errorMessage: null,
              ...paymentDateUpdates(status, normalized.object),
            },
          });

          if (status === "SUCCEEDED") {
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                status: "PAID",
                paymentStatus: "SUCCEEDED",
                fulfillmentStatus: payment.order.fulfillmentStatus === "NOT_FULFILLED"
                  ? "NOT_FULFILLED"
                  : payment.order.fulfillmentStatus,
              },
            });
            await deductStockForPaidOrder(tx, payment.orderId);
            await issueGiftCertificatesForPaidOrder(tx, payment.orderId);
          } else if (status === "CANCELED") {
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                status: "CANCELLED",
                paymentStatus: "CANCELED",
                fulfillmentStatus: "CANCELLED",
              },
            });
            await refundOrderBalancePayment(tx, payment.orderId);
          } else if (status === "WAITING_FOR_CAPTURE" || status === "PENDING") {
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                status: "AWAITING_PAYMENT",
                paymentStatus: status,
              },
            });
          } else {
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                status: "AWAITING_PAYMENT",
                paymentStatus: "FAILED",
              },
            });
          }

          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              paymentId: payment.id,
              orderId: payment.orderId,
              processed: true,
              processedAt: new Date(),
              error: null,
            },
          });

          return { paymentId: payment.id, orderId: payment.orderId, status };
        }

        if (normalized.eventType === "refund.succeeded") {
          const providerPaymentId =
            typeof normalized.object.payment_id === "string" ? normalized.object.payment_id : null;

          if (!providerPaymentId || !normalized.objectId) {
            throw new Error("Refund webhook payload does not contain refund or payment id.");
          }

          const payment = await tx.payment.findFirst({
            where: { providerPaymentId },
          });

          if (!payment) {
            throw new Error(`Payment ${providerPaymentId} was not found.`);
          }

          const status = mapRefundStatus(normalized.object.status);
          const amount = amountToStoreAmount(normalized.object.amount);
          const currency = amountCurrency(normalized.object.amount);

          if (amount <= 0 || amount > payment.amount) {
            throw new Error("Refund webhook amount is invalid for the stored payment.");
          }

          if (currency && currency !== payment.currency) {
            throw new Error("Refund webhook currency does not match the stored payment currency.");
          }

          await tx.refund.upsert({
            where: { providerRefundId: normalized.objectId },
            create: {
              paymentId: payment.id,
              orderId: payment.orderId,
              providerRefundId: normalized.objectId,
              amount,
              currency: currency ?? DEFAULT_CURRENCY,
              status,
              rawResponse: normalized.payloadJson,
            },
            update: {
              status,
              amount,
              rawResponse: normalized.payloadJson,
            },
          });

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "REFUNDED",
              refundedAt: new Date(),
              webhookPayload: normalized.payloadJson,
            },
          });
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              status: "REFUNDED",
              paymentStatus: "REFUNDED",
            },
          });

          await tx.webhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
              paymentId: payment.id,
              orderId: payment.orderId,
              processed: true,
              processedAt: new Date(),
              error: null,
            },
          });

          return { paymentId: payment.id, orderId: payment.orderId, status: "REFUNDED" as const };
        }

        await tx.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            processed: true,
            processedAt: new Date(),
            error: null,
          },
        });

        return { paymentId: null, orderId: null, status: "IGNORED" as const };
      },
      {
        isolationLevel: PrismaNamespace.TransactionIsolationLevel.Serializable,
      },
    );

    if (result.orderId) {
      if (result.status === "SUCCEEDED") {
        await notifyOrderPaidOnSite(result.orderId);
      }

      const analyticsEventType =
        result.status === "SUCCEEDED"
          ? "payment_succeeded"
          : result.status === "CANCELED"
            ? "payment_canceled"
            : result.status === "FAILED"
              ? "payment_failed"
              : null;

      if (analyticsEventType) {
        await recordAnalyticsEvent({
          eventType: analyticsEventType,
          entityType: "payment",
          entityId: result.orderId,
          entityName: result.orderId,
          path: "/api/payments/yookassa/webhook",
          deviceType: "desktop",
          metadata: {
            provider: "YOOKASSA",
            paymentId: result.paymentId,
            status: result.status,
          },
        });
      }
    }

    return { processed: true, duplicate: false, eventId: webhookEvent.id, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown YooKassa webhook error.";
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { error: message },
    });
    throw error;
  }
}

export function getYooKassaErrorDetails(error: unknown) {
  if (error instanceof YooKassaApiError) {
    return {
      code: error.code,
      message: error.message,
      rawResponse: error.rawResponse,
    };
  }

  return {
    code: "PAYMENT_PROVIDER_ERROR",
    message: error instanceof Error ? error.message : "Не удалось создать платеж.",
    rawResponse: null,
  };
}
