import type { AddressInput, UserAddress } from "@/lib/account-types";

export type AdminUserRole = "USER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "DISABLED";
export type AdminOrderStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";
export type AdminPaymentStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "WAITING_FOR_CAPTURE"
  | "SUCCEEDED"
  | "CANCELED"
  | "REFUNDED"
  | "FAILED";
export type AdminFulfillmentStatus =
  | "NOT_FULFILLED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export type AdminUserSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  ordersTotal: number;
  addressCount: number;
};

export type AdminUserDetail = AdminUserSummary & {
  birthday: string | null;
  favoriteDriver: string | null;
  favoriteTeam: string | null;
  addresses: UserAddress[];
  orders: AdminOrderSummary[];
};

export type AdminOrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  productSlug: string;
  productName: string;
  variantName: string;
  sku: string | null;
  imageUrl: string;
  productType: string;
  productKind: string;
  requiresShipping: boolean;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type AdminOrderCustomer = {
  name: string;
  email: string;
  phone: string;
};

export type AdminOrderUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: AdminUserRole;
  status: AdminUserStatus;
} | null;

export type AdminOrderSummary = {
  id: string;
  orderNumber: string;
  userId: string | null;
  user: AdminOrderUser;
  createdAt: string;
  updatedAt: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  fulfillmentStatus: AdminFulfillmentStatus;
  customer: AdminOrderCustomer;
  shippingAddress: AddressInput | null;
  deliveryMethod: string;
  paymentMethod: string;
  comment: string;
  itemCount: number;
  itemNames: string[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  currency: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  items: AdminOrderItem[];
  amountPaidByBalance: number;
  amountPaidByExternalMethod: number;
  balanceBefore: number;
  balanceAfter: number;
  usedBalance: boolean;
  payment: {
    provider: "YOOKASSA" | "MOCK";
    status: AdminPaymentStatus;
    amount: number;
    currency: string;
    confirmationUrl: string | null;
    paidAt: string | null;
    capturedAt: string | null;
    canceledAt: string | null;
    refundedAt: string | null;
  } | null;
};

export type AdminAddressRecord = UserAddress & {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: AdminUserStatus;
  };
  shippingOrderCount: number;
};
