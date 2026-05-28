import type { CommerceProductKind, ProductColor, ProductSize, ProductType } from "@/lib/types";

export type CartSelection = {
  productId: string;
  color: ProductColor;
  size: ProductSize;
  quantity: number;
};

export type UserRole = "customer" | "admin";

export type GiftCertificateStatus = "purchased" | "activated" | "expired" | "cancelled";
export type BalanceTransactionType =
  | "gift_certificate_activation"
  | "purchase_payment"
  | "refund"
  | "manual_adjustment";

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  birthday: string | null;
  favoriteDriver: string | null;
  favoriteTeam: string | null;
  acceptedLegalAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
  passwordSalt?: string;
  passwordVersion?: number;
};

export type AuthSession = {
  id: string;
  userId: string;
  rememberMe: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
  acceptedLegal: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ProfilePayload = {
  name: string;
  email: string;
  phone: string;
  birthday: string | null;
  favoriteDriver: string | null;
  favoriteTeam: string | null;
};

export type AddressInput = {
  country: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  recipient: string;
  recipientPhone: string;
  courierComment: string;
};

export type UserAddress = AddressInput & {
  id: string;
  userId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteRecord = {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
};

export type OrderStatus =
  | "Новый"
  | "Ожидает оплаты"
  | "Оплачен"
  | "В производстве"
  | "Отправлен"
  | "Доставлен"
  | "Отменён"
  | "Возвращён";

export type OrderPaymentStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "WAITING_FOR_CAPTURE"
  | "SUCCEEDED"
  | "CANCELED"
  | "REFUNDED"
  | "FAILED";

export type OrderFulfillmentStatus =
  | "NOT_FULFILLED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type OrderPayment = {
  provider: "YOOKASSA" | "MOCK";
  status: OrderPaymentStatus;
  amount: number;
  currency: string;
  confirmationUrl: string | null;
};

export type DeliveryMethod = "СДЭК" | "Почта России" | "Курьер" | "Самовывоз" | "Цифровой сертификат";
export type PaymentMethod =
  | "Банковская карта"
  | "СБП"
  | "Telegram Wallet"
  | "Криптовалюта"
  | "Баланс аккаунта";

export type OrderItem = {
  productId: string;
  variantId: string | null;
  slug: string;
  name: string;
  variantName: string;
  sku: string | null;
  image: string;
  productType: ProductType;
  productKind: CommerceProductKind;
  requiresShipping: boolean;
  color: ProductColor;
  size: ProductSize;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderAddressSnapshot = AddressInput;

export type OrderCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type GiftCertificate = {
  id: string;
  amount: number;
  code: string;
  status: GiftCertificateStatus;
  purchasedByUserId: string | null;
  activatedByUserId: string | null;
  orderId: string;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
};

export type IssuedGiftCertificate = {
  id: string;
  amount: number;
  code: string;
  status: GiftCertificateStatus;
  orderId: string;
  purchasedByUserId: string | null;
  activatedByUserId: string | null;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
};

export type UserBalance = {
  userId: string;
  amount: number;
  updatedAt: string;
};

export type BalanceTransaction = {
  id: string;
  userId: string;
  type: BalanceTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  certificateCode: string | null;
  orderId: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  payment: OrderPayment | null;
  items: OrderItem[];
  itemCount: number;
  customer: OrderCustomer;
  shippingAddress: OrderAddressSnapshot | null;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  comment: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  amountPaidByBalance: number;
  amountPaidByExternalMethod: number;
  balanceBefore: number;
  balanceAfter: number;
  usedBalance: boolean;
  giftCertificatesIssued: IssuedGiftCertificate[];
};

export type CheckoutPayload = {
  userId: string | null;
  customer: OrderCustomer;
  shippingAddress: OrderAddressSnapshot | null;
  deliveryMethod: DeliveryMethod | null;
  paymentMethod: PaymentMethod;
  comment: string;
  selections: CartSelection[];
  useBalance: boolean;
  requestedBalanceAmount: number | null;
};
