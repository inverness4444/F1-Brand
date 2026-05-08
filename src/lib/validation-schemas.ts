import { z } from "zod";

import type {
  StoredUser,
} from "@/lib/account-types";
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
  sanitizeSearchQuery,
  sanitizeText,
} from "@/lib/security-utils";
import {
  normalizeGiftCertificateCode,
  validateGiftCertificateCode,
} from "@/lib/gift-certificate-utils";

const userRoleSchema = z.enum(["customer", "admin"]);
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
  "Accessory",
  "Calendar",
  "Poster",
  "Gift Certificate",
]);
const productBadgeSchema = z.enum(["New", "Hit", "Limited", "Preorder", "OutOfStock", "Sale"]);
const commerceProductKindSchema = z.enum(["standard", "gift_certificate"]);
const orderStatusSchema = z.enum([
  "Новый",
  "Оплачен",
  "В производстве",
  "Отправлен",
  "Доставлен",
  "Отменён",
]);
const deliveryMethodSchema = z.enum(["СДЭК", "Почта России", "Курьер", "Самовывоз", "Цифровой сертификат"]);
const paymentMethodSchema = z.enum([
  "Банковская карта",
  "СБП",
  "Telegram Wallet",
  "Криптовалюта",
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

export const promoCodeSchema = z.object({
  code: z
    .string()
    .transform((value) => sanitizeIdentifier(value, "").toUpperCase())
    .refine((value) => value.length > 0, "Введите промокод.")
    .refine((value) => value.length <= SECURITY_LIMITS.promoCodeMaxLength, "Промокод слишком длинный."),
});

export const giftCertificateCodeSchema = z.object({
  code: z
    .string()
    .transform(normalizeGiftCertificateCode)
    .refine((value) => value.length > 0, "Введите промокод.")
    .refine((value) => validateGiftCertificateCode(value), "Код должен состоять ровно из 8 латинских букв."),
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
  slug: z.string().transform((value) => sanitizeIdentifier(value, "")),
  name: requiredTextSchema(SECURITY_LIMITS.catalogNameMaxLength, "Укажите название товара."),
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
  unitPrice: z.number().int().min(0),
  lineTotal: z.number().int().min(0),
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
  price: z.number().int().min(0).max(1_000_000),
  productType: commerceProductKindSchema.default("standard"),
  requiresShipping: z.boolean().default(true),
  colors: z.array(productColorSchema).min(1).max(12),
  sizes: z.array(productSizeSchema).min(1).max(7),
  type: productTypeSchema,
  badge: productBadgeSchema,
  image: z.string().transform(sanitizeAssetUrl),
  gallery: z.array(z.string().transform(sanitizeAssetUrl)).max(16),
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
});

export const catalogCollectionSchema = z.object({
  id: z.string().transform((value) => sanitizeIdentifier(value, "")),
  slug: z.string().transform((value) => sanitizeIdentifier(value, "")),
  name: requiredTextSchema(SECURITY_LIMITS.catalogMetadataMaxLength, "Укажите название коллекции."),
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
