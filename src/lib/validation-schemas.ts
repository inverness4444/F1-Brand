import { z } from "zod";

import type {
  StoredUser,
} from "@/lib/account-types";
import {
  analyticsDeviceTypes,
  analyticsEntityTypes,
  analyticsEventTypes,
} from "@/lib/analytics";
import { isValidEmail, isValidPhone } from "@/lib/account-utils";
import {
  SECURITY_LIMITS,
  resolveUserRole,
  sanitizeAddressField,
  sanitizeAssetUrl,
  sanitizeEmail,
  sanitizeHexColor,
  sanitizeIdentifier,
  sanitizeMultilineComment,
  sanitizePhone,
  sanitizePromoCode,
  sanitizeSearchQuery,
  sanitizeText,
} from "@/lib/security-utils";
import {
  normalizeGiftCertificateCode,
  validateGiftCertificateCode,
} from "@/lib/gift-certificate-utils";

const userRoleSchema = z.enum(["customer", "admin"]);
const adminUserRoleSchema = z.enum(["USER", "ADMIN"]);
const adminUserStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
const productColorSchema = z.enum([
  "Black",
  "White",
  "Navy",
  "Grey",
  "Red",
  "Orange",
  "Green",
  "Blue",
  "Yellow",
  "Silver",
  "Beige",
  "Pink",
]);
const productSizeSchema = z.enum(["XS", "S", "M", "L", "XL", "XXL", "One Size"]);
const productGenderSchema = z.enum(["Men", "Women", "Unisex"]);
const catalogCategorySchema = z.enum(["Pilots", "Teams", "Legends", "Accessories", "Essentials", "Gifts"]);
const productCollectionNameSchema = z
  .string()
  .transform((value) => sanitizeText(value, { maxLength: SECURITY_LIMITS.catalogMetadataMaxLength }));
const productTypeSchema = z.enum([
  "T-shirt",
  "Hoodie",
  "Longsleeve",
  "Jacket",
  "Polo",
  "Pants",
  "Scarf",
  "Lego",
  "Cap",
  "Keychain",
  "Accessory",
  "Wallet",
  "Cardholder",
  "Calendar",
  "Poster",
  "Gift Certificate",
]);
const productBadgeSchema = z.enum(["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale", "Original"]);
const productStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
const commerceProductKindSchema = z.enum(["standard", "gift_certificate"]);
const prismaOrderStatusSchema = z.enum([
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);
const orderStatusSchema = z.enum([
  "Создан",
  "Ожидает оплаты",
  "Оплачен",
  "В обработке",
  "Передан в доставку",
  "Доставлен",
  "Отменён",
  "Возврат",
]);
const siteNotificationTypeSchema = z.enum([
  "ORDER_CREATED",
  "ORDER_PAID",
  "ORDER_STATUS_UPDATED",
  "ADMIN_NEW_ORDER",
]);
const orderPaymentStatusSchema = z.enum([
  "NOT_STARTED",
  "PENDING",
  "WAITING_FOR_CAPTURE",
  "SUCCEEDED",
  "CANCELED",
  "REFUNDED",
  "FAILED",
]);
const orderFulfillmentStatusSchema = z.enum([
  "NOT_FULFILLED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
]);
const paymentProviderSchema = z.enum(["YOOKASSA", "MOCK"]);
const deliveryMethodSchema = z.enum(["СДЭК", "Почта России", "Курьер", "Цифровой сертификат"]);
const paymentMethodSchema = z.enum([
  "Банковская карта",
  "СБП",
  "Баланс аккаунта",
]);
const giftCertificateStatusSchema = z.enum(["purchased", "activated", "expired", "cancelled"]);
const balanceTransactionTypeSchema = z.enum([
  "gift_certificate_activation",
  "purchase_payment",
  "refund",
  "manual_adjustment",
]);

const isoDateSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Некорректная дата.");

function requiredTextSchema(maxLength: number, message: string) {
  return z
    .string()
    .transform((value) => sanitizeText(value, { maxLength }))
    .refine((value) => value.length > 0, message);
}

function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .optional()
    .nullable()
    .transform((value) => sanitizeText(value ?? "", { maxLength }));
}

function requiredAddressField(message: string, maxLength: number = SECURITY_LIMITS.addressFieldMaxLength) {
  return z
    .string()
    .transform((value) => sanitizeAddressField(value, maxLength))
    .refine((value) => value.length > 0, message);
}

export const loginPayloadSchema = z.object({
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов.")
    .max(SECURITY_LIMITS.passwordMaxLength, "Пароль слишком длинный."),
  rememberMe: z.boolean(),
});

export const forgotPasswordPayloadSchema = z.object({
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
});

export const registerPayloadSchema = z
  .object({
    name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Введите имя."),
    email: z
      .string()
      .transform(sanitizeEmail)
      .refine((value) => isValidEmail(value), "Введите корректный email."),
    phone: z
      .string()
      .transform(sanitizePhone)
      .refine((value) => isValidPhone(value), "Введите корректный телефон."),
    password: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов.")
      .max(SECURITY_LIMITS.passwordMaxLength, "Пароль слишком длинный."),
    acceptedLegal: z.literal(true, {
      errorMap: () => ({ message: "Подтвердите согласие с политикой и офертой." }),
    }),
  })
  .strict();

export const profilePayloadSchema = z.object({
  name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Введите имя."),
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
  phone: z
    .string()
    .transform(sanitizePhone)
    .refine((value) => isValidPhone(value), "Введите корректный телефон."),
  birthday: z
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      const nextValue = sanitizeText(value ?? "", { maxLength: 10 });
      return nextValue || null;
    })
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Укажите корректную дату."),
  favoriteDriver: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
  favoriteTeam: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
});

export const adminUserUpdateSchema = z
  .object({
    name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Введите имя."),
    email: z
      .string()
      .transform(sanitizeEmail)
      .refine((value) => isValidEmail(value), "Введите корректный email."),
    phone: z
      .string()
      .nullable()
      .optional()
      .transform((value) => sanitizePhone(value ?? ""))
      .refine((value) => value === "" || isValidPhone(value), "Введите корректный телефон."),
    role: adminUserRoleSchema,
    status: adminUserStatusSchema,
    birthday: z
      .string()
      .nullable()
      .optional()
      .transform((value) => {
        const nextValue = sanitizeText(value ?? "", { maxLength: 10 });
        return nextValue || null;
      })
      .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Укажите корректную дату."),
    favoriteDriver: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
    favoriteTeam: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
  })
  .strict();

export const addressInputSchema = z.object({
  country: requiredAddressField("Укажите страну."),
  city: requiredAddressField("Укажите город."),
  street: requiredAddressField("Укажите улицу."),
  house: requiredAddressField("Укажите дом."),
  apartment: optionalTextSchema(SECURITY_LIMITS.addressFieldMaxLength),
  postalCode: requiredAddressField("Укажите индекс.", SECURITY_LIMITS.phoneMaxLength),
  recipient: requiredAddressField("Укажите получателя."),
  recipientPhone: z
    .string()
    .transform(sanitizePhone)
    .refine((value) => isValidPhone(value), "Укажите корректный телефон получателя."),
  courierComment: z
    .string()
    .optional()
    .nullable()
    .transform((value) => sanitizeMultilineComment(value ?? "", SECURITY_LIMITS.addressCommentMaxLength)),
});

export const adminAddressUpdateSchema = z
  .object({
    address: addressInputSchema,
    isDefault: z.boolean().default(false),
  })
  .strict();

export const checkoutCustomerSchema = z.object({
  name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Введите имя."),
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
  phone: z
    .string()
    .transform(sanitizePhone)
    .refine((value) => isValidPhone(value), "Введите корректный телефон."),
});

export const newsletterSchema = z.object({
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
});

const newsletterSourceSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => sanitizeIdentifier(value ?? "homepage", "homepage").slice(0, 80));

export const newsletterSubscriptionSchema = newsletterSchema
  .extend({
    source: newsletterSourceSchema,
  })
  .strict();

const analyticsTextSchema = (maxLength: number) =>
  z
    .string()
    .optional()
    .nullable()
    .transform((value) => {
      const sanitizedValue = sanitizeText(value ?? "", { maxLength });
      return sanitizedValue || null;
    });

const analyticsMetadataScalarSchema = z.union([
  z.string().transform((value) => sanitizeText(value, { maxLength: 240 })),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const analyticsMetadataValueSchema = z.union([
  analyticsMetadataScalarSchema,
  z.array(analyticsMetadataScalarSchema).max(16),
]);

export const analyticsEventPayloadSchema = z
  .object({
    eventType: z.enum(analyticsEventTypes),
    entityType: z.enum(analyticsEntityTypes),
    entityId: analyticsTextSchema(120).transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
    entityName: analyticsTextSchema(180),
    sessionId: analyticsTextSchema(120).transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
    path: analyticsTextSchema(500).transform((value) => value ?? "/"),
    referrer: analyticsTextSchema(500),
    deviceType: z.enum(analyticsDeviceTypes).optional(),
    metadata: z
      .record(analyticsMetadataValueSchema)
      .optional()
      .transform((value) => {
        if (!value) {
          return null;
        }

        return Object.fromEntries(
          Object.entries(value)
            .slice(0, 20)
            .map(([key, entry]) => [
              sanitizeIdentifier(key, "field").slice(0, 80),
              entry,
            ])
            .filter(([key]) => Boolean(key)),
        );
      }),
  })
  .strict();

export const promoCodeSchema = z.object({
  code: z
    .string()
    .transform(sanitizePromoCode)
    .refine((value) => value.length > 0, "Введите промокод.")
    .refine((value) => value.length <= SECURITY_LIMITS.promoCodeMaxLength, "Промокод слишком длинный."),
});

export const giftCertificateCodeSchema = z.object({
  code: z
    .string()
    .transform(normalizeGiftCertificateCode)
    .refine((value) => value.length > 0, "Введите код сертификата.")
    .refine((value) => validateGiftCertificateCode(value), "Код должен состоять ровно из 8 латинских букв."),
});

export const contactFormSchema = z.object({
  name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Введите имя."),
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Введите корректный email."),
  subject: requiredTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength, "Укажите тему обращения."),
  message: z
    .string()
    .transform((value) => sanitizeMultilineComment(value, SECURITY_LIMITS.catalogDescriptionMaxLength))
    .refine((value) => value.length > 0, "Введите сообщение."),
});

export const registerFormSchema = registerPayloadSchema
  .extend({
    confirmPassword: z
      .string()
      .min(8, "Пароль должен содержать минимум 8 символов.")
      .max(SECURITY_LIMITS.passwordMaxLength, "Пароль слишком длинный."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Пароли должны совпадать.",
  });

export const searchQuerySchema = z.object({
  query: z.string().transform(sanitizeSearchQuery),
});

export const filterParamSchema = z.object({
  category: catalogCategorySchema.or(z.literal("All")).optional(),
  team: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || undefined),
  driver: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || undefined),
  legend: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || undefined),
  type: productTypeSchema.optional(),
  collection: productCollectionNameSchema.optional().transform((value) => value || undefined),
  q: z
    .string()
    .optional()
    .transform((value) => sanitizeSearchQuery(value ?? ""))
    .transform((value) => value || undefined),
});

export const authUserSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  role: userRoleSchema.default("customer"),
  name: requiredTextSchema(SECURITY_LIMITS.nameMaxLength, "Укажите имя."),
  email: z
    .string()
    .transform(sanitizeEmail)
    .refine((value) => isValidEmail(value), "Некорректный email."),
  phone: z
    .string()
    .transform(sanitizePhone)
    .refine((value) => value === "" || isValidPhone(value), "Некорректный телефон."),
  birthday: z
    .string()
    .nullable()
    .transform((value) => {
      const nextValue = sanitizeText(value ?? "", { maxLength: 10 });
      return nextValue || null;
    }),
  favoriteDriver: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
  favoriteTeam: optionalTextSchema(SECURITY_LIMITS.profileTextMaxLength).transform((value) => value || null),
  acceptedLegalAt: isoDateSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const storedUserSchema = authUserSchema.extend({
  passwordHash: z
    .string()
    .min(12, "Некорректный hash пароля.")
    .max(SECURITY_LIMITS.passwordMaxLength * 4, "Некорректный hash пароля."),
  passwordSalt: z
    .string()
    .optional()
    .default("")
    .transform((value) => sanitizeIdentifier(value, "")),
  passwordVersion: z.number().int().min(1).max(9).optional().default(2),
});

export const authSessionSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  rememberMe: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  expiresAt: isoDateSchema,
});

export const cartSelectionSchema = z.object({
  productId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  color: productColorSchema,
  size: productSizeSchema,
  quantity: z
    .number()
    .int()
    .min(1)
    .max(SECURITY_LIMITS.maxCartItemQuantity),
});

export const userAddressSchema = addressInputSchema.extend({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  isDefault: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const favoriteRecordSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  productId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  createdAt: isoDateSchema,
});

export const orderItemSchema = z.object({
  productId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  variantId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  slug: z.string().transform((value) => sanitizeIdentifier(value, "")),
  name: requiredTextSchema(SECURITY_LIMITS.catalogNameMaxLength, "Укажите название товара."),
  variantName: z.string().transform((value) => sanitizeText(value, { maxLength: 120 })),
  sku: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "").toUpperCase() : null)),
  image: z.string().transform(sanitizeAssetUrl),
  productType: productTypeSchema,
  productKind: commerceProductKindSchema.default("standard"),
  requiresShipping: z.boolean().default(true),
  color: productColorSchema,
  size: productSizeSchema,
  quantity: z
    .number()
    .int()
    .min(1)
    .max(SECURITY_LIMITS.maxCartItemQuantity),
  unitPrice: z.number().int().min(1),
  lineTotal: z.number().int().min(1),
});

export const orderSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  orderNumber: z.string().transform((value) => sanitizeIdentifier(value.toUpperCase(), "")),
  userId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  status: orderStatusSchema,
  paymentStatus: orderPaymentStatusSchema,
  fulfillmentStatus: orderFulfillmentStatusSchema,
  payment: z
    .object({
      provider: paymentProviderSchema,
      status: orderPaymentStatusSchema,
      amount: z.number().int().min(0),
      currency: z.string().min(3).max(3),
      confirmationUrl: z.string().url().nullable(),
    })
    .nullable(),
  items: z.array(orderItemSchema),
  itemCount: z.number().int().min(0),
  customer: checkoutCustomerSchema,
  shippingAddress: addressInputSchema.nullable(),
  deliveryMethod: deliveryMethodSchema,
  paymentMethod: paymentMethodSchema,
  comment: z.string().transform((value) => sanitizeMultilineComment(value)),
  subtotal: z.number().int().min(0),
  shippingCost: z.number().int().min(0),
  total: z.number().int().min(0),
  amountPaidByBalance: z.number().int().min(0),
  amountPaidByExternalMethod: z.number().int().min(0),
  balanceBefore: z.number().int().min(0),
  balanceAfter: z.number().int().min(0),
  usedBalance: z.boolean().default(false),
  giftCertificatesIssued: z.array(
    z.object({
      id: z.string().transform((value) => sanitizeIdentifier(value, "")),
      amount: z.number().int().min(0),
      code: z.string().transform(normalizeGiftCertificateCode).refine(validateGiftCertificateCode),
      status: giftCertificateStatusSchema,
      orderId: z.string().transform((value) => sanitizeIdentifier(value, "")),
      purchasedByUserId: z
        .string()
        .nullable()
        .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
      activatedByUserId: z
        .string()
        .nullable()
        .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
      createdAt: isoDateSchema,
      activatedAt: isoDateSchema.nullable(),
      expiresAt: isoDateSchema.nullable(),
    }),
  ),
});

export const siteNotificationSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  orderId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  type: siteNotificationTypeSchema,
  title: z.string().transform((value) => sanitizeText(value, { maxLength: 120 })),
  message: z.string().transform((value) => sanitizeText(value, { maxLength: 500 })),
  isRead: z.boolean(),
  createdAt: isoDateSchema,
});

export const siteNotificationsSchema = z.array(siteNotificationSchema);

export const checkoutPayloadSchema = z.object({
  userId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  customer: checkoutCustomerSchema,
  shippingAddress: addressInputSchema.nullable(),
  deliveryMethod: deliveryMethodSchema.nullable(),
  paymentMethod: paymentMethodSchema,
  comment: z.string().transform((value) => sanitizeMultilineComment(value)),
  selections: z.array(cartSelectionSchema).min(1, "Корзина пуста."),
  useBalance: z.boolean().default(false),
  requestedBalanceAmount: z.number().int().min(0).nullable().default(null),
});

export const adminOrderUpdateSchema = z
  .object({
    status: prismaOrderStatusSchema.optional(),
    paymentStatus: orderPaymentStatusSchema.optional(),
    fulfillmentStatus: orderFulfillmentStatusSchema.optional(),
    customer: checkoutCustomerSchema.optional(),
    shippingAddress: addressInputSchema.nullable().optional(),
    comment: z.string().transform((value) => sanitizeMultilineComment(value)).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нет данных для обновления.");

export const persistedCartStateSchema = z
  .object({
    state: z
      .object({
        items: z.array(cartSelectionSchema).default([]),
      })
      .passthrough(),
    version: z.number().int().optional(),
  })
  .passthrough();

export const productSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  slug: z.string().transform((value) => sanitizeIdentifier(value, "")),
  name: requiredTextSchema(SECURITY_LIMITS.catalogNameMaxLength, "Укажите название товара."),
  category: catalogCategorySchema,
  collection: productCollectionNameSchema,
  collectionTags: z.array(productCollectionNameSchema).max(16).transform((values) => values.filter(Boolean)),
  driverName: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  driverSlug: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  teamName: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  teamSlug: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  legendName: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  legendSlug: optionalTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength).transform((value) => value || null),
  gender: productGenderSchema,
  price: z.number().int().min(1, "Цена товара должна быть больше 0.").max(1_000_000),
  oldPrice: z.number().int().min(1).max(1_000_000).nullable().optional().default(null),
  stock: z.number().int().min(0).max(1_000_000).nullable().optional().default(null),
  productType: commerceProductKindSchema.default("standard"),
  requiresShipping: z.boolean().default(true),
  colors: z.array(productColorSchema).min(1).max(12),
  colorways: z.array(productColorSchema).max(12).optional().default([]),
  colorwayImages: z
    .record(
      productColorSchema,
      z
        .string()
        .transform(sanitizeAssetUrl)
        .refine((value) => value.length > 0, "Укажите URL изображения.")
        .refine((value) => !value.startsWith("data:") && !value.startsWith("blob:"), "Загрузите постоянное изображение."),
    )
    .optional()
    .default({}),
  sizes: z.array(productSizeSchema).min(1).max(7),
  type: productTypeSchema,
  badge: productBadgeSchema,
  status: productStatusSchema.optional().default("ACTIVE"),
  image: z
    .string()
    .transform(sanitizeAssetUrl)
    .refine((value) => value.length > 0, "Укажите URL изображения.")
    .refine((value) => !value.startsWith("data:") && !value.startsWith("blob:"), "Загрузите постоянное изображение."),
  gallery: z
    .array(
      z
        .string()
        .transform(sanitizeAssetUrl)
        .refine((value) => value.length > 0, "Укажите URL изображения.")
        .refine((value) => !value.startsWith("data:") && !value.startsWith("blob:"), "Загрузите постоянное изображение."),
    )
    .max(16),
  description: z
    .string()
    .transform((value) => sanitizeMultilineComment(value, SECURITY_LIMITS.catalogDescriptionMaxLength))
    .refine((value) => value.length > 0, "Укажите описание товара."),
  shortDescription: z
    .string()
    .transform((value) => sanitizeText(value, { maxLength: SECURITY_LIMITS.catalogShortDescriptionMaxLength }))
    .refine((value) => value.length > 0, "Укажите краткое описание товара."),
  popularity: z.number().int().min(1).max(100),
  createdAt: isoDateSchema,
  number: z.number().int().min(0).max(99).optional(),
  hexPalette: z.array(z.string().transform(sanitizeHexColor)).min(1).max(6),
  variants: z
    .array(
      z.object({
        id: z.string().transform((value) => sanitizeIdentifier(value, "")),
        sku: z.string().transform((value) => sanitizeIdentifier(value, "").toUpperCase()),
        size: productSizeSchema,
        color: productColorSchema,
        stock: z.number().int().min(0),
        priceOverride: z.number().int().min(1).nullable(),
      }),
    )
    .optional(),
});

export const catalogCollectionSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  slug: z.string().transform((value) => sanitizeIdentifier(value, "")),
  name: requiredTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength, "Укажите название коллекции."),
  visible: z.boolean().optional().default(true),
  productIds: z.array(z.string().transform((value) => sanitizeIdentifier(value, ""))).max(500).default([]),
  createdAt: isoDateSchema,
});

export const catalogProductsPayloadSchema = z.object({
  products: z.array(productSchema).max(500),
});

export const catalogPayloadSchema = z.object({
  products: z.array(productSchema).max(500),
  collections: z.array(catalogCollectionSchema).max(100).default([]),
});

export const giftCertificateSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  amount: z.number().int().min(0),
  code: z.string().transform(normalizeGiftCertificateCode).refine(validateGiftCertificateCode),
  status: giftCertificateStatusSchema,
  purchasedByUserId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  activatedByUserId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  orderId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  createdAt: isoDateSchema,
  activatedAt: isoDateSchema.nullable(),
  expiresAt: isoDateSchema.nullable(),
});

export const userBalanceSchema = z.object({
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  amount: z.number().int().min(0),
  updatedAt: isoDateSchema,
});

export const balanceTransactionSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  userId: z.string().transform((value) => sanitizeIdentifier(value, "")),
  type: balanceTransactionTypeSchema,
  amount: z.number().int(),
  balanceBefore: z.number().int().min(0),
  balanceAfter: z.number().int().min(0),
  certificateCode: z
    .string()
    .nullable()
    .transform((value) => (value ? normalizeGiftCertificateCode(value) : null))
    .refine((value) => value === null || validateGiftCertificateCode(value), "Некорректный код сертификата."),
  orderId: z
    .string()
    .nullable()
    .transform((value) => (value ? sanitizeIdentifier(value, "") : null)),
  createdAt: isoDateSchema,
});

export const storedUsersSchema = z.array(storedUserSchema);
export const authSessionsSchema = z.array(authSessionSchema);
export const addressesSchema = z.array(userAddressSchema);
export const favoritesSchema = z.array(favoriteRecordSchema);
export const ordersSchema = z.array(orderSchema);
export const giftCertificatesSchema = z.array(giftCertificateSchema);
export const userBalancesSchema = z.array(userBalanceSchema);
export const balanceTransactionsSchema = z.array(balanceTransactionSchema);
export const cartSelectionsSchema = z.array(cartSelectionSchema);

export function normalizeStoredUserRole(user: StoredUser) {
  return {
    ...user,
    role: resolveUserRole(user.email),
  };
}
