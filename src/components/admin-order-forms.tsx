"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  AdminFulfillmentStatus,
  AdminOrderDetail,
  AdminOrderStatus,
  AdminPaymentStatus,
} from "@/lib/admin-types";
import {
  adminFulfillmentStatusOptions,
  adminOrderStatusOptions,
  adminPaymentStatusOptions,
} from "@/lib/admin-constants";
import { adminOrderUpdateSchema } from "@/lib/validation-schemas";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { useToastStore } from "@/store/toast-store";
import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";

type StatusValues = {
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  fulfillmentStatus: AdminFulfillmentStatus;
  comment: string;
};

type CustomerValues = {
  name: string;
  email: string;
  phone: string;
};

type StatusErrors = Partial<Record<keyof StatusValues | "form", string>>;
type CustomerErrors = Partial<Record<keyof CustomerValues | "form", string>>;

async function patchOrder(orderId: string, payload: unknown) {
  const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(responsePayload?.error ?? "Не удалось сохранить заказ.");
  }
}

export function AdminOrderStatusForm({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [values, setValues] = useState<StatusValues>({
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    comment: order.comment,
  });
  const [errors, setErrors] = useState<StatusErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <Key extends keyof StatusValues>(key: Key, value: StatusValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const input = adminOrderUpdateSchema.parse(values);
      await patchOrder(order.id, input);
      setErrors({});
      pushToast("Статусы заказа сохранены", "success");
      router.refresh();
    } catch (error) {
      const fieldErrors = getZodFieldErrors<keyof StatusValues>(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setErrors({ form: getErrorMessage(error, "Не удалось сохранить заказ.") });
      }
      pushToast(getErrorMessage(error, "Не удалось сохранить заказ."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Статусы заказа</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Используются существующие enum-поля заказа.</p>
        </div>
        <Button type="submit" className="rounded-2xl" disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? "Сохраняем" : "Сохранить"}
        </Button>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <label className="label-base">
          <span className="label-title">Статус заказа</span>
          <select
            value={values.status}
            onChange={(event) => updateField("status", event.target.value as AdminOrderStatus)}
            className="field-base"
          >
            {adminOrderStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label-base">
          <span className="label-title">Статус оплаты</span>
          <select
            value={values.paymentStatus}
            onChange={(event) => updateField("paymentStatus", event.target.value as AdminPaymentStatus)}
            className="field-base"
          >
            {adminPaymentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label-base">
          <span className="label-title">Статус доставки</span>
          <select
            value={values.fulfillmentStatus}
            onChange={(event) => updateField("fulfillmentStatus", event.target.value as AdminFulfillmentStatus)}
            className="field-base"
          >
            {adminFulfillmentStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="label-base sm:col-span-3">
          <span className="label-title">Комментарий к заказу</span>
          <textarea
            value={values.comment}
            onChange={(event) => updateField("comment", event.target.value)}
            className="field-base textarea-base"
            maxLength={280}
          />
          {errors.comment ? <span className="error-text">{errors.comment}</span> : null}
        </label>
      </div>

      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}
    </form>
  );
}

export function AdminOrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: AdminOrderStatus;
}) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [value, setValue] = useState(status);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setValue(status);
  }, [status]);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as AdminOrderStatus;
    setValue(nextStatus);
    setIsSaving(true);

    try {
      const input = adminOrderUpdateSchema.parse({ status: nextStatus });
      await patchOrder(orderId, input);
      pushToast("Статус заказа обновлён", "success");
      router.refresh();
    } catch (error) {
      setValue(status);
      pushToast(getErrorMessage(error, "Не удалось обновить статус заказа."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <label className="block">
      <span className="sr-only">Статус заказа</span>
      <select value={value} onChange={handleChange} disabled={isSaving} className="field-base min-h-10 text-xs">
        {adminOrderStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminOrderCustomerForm({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [values, setValues] = useState<CustomerValues>(order.customer);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <Key extends keyof CustomerValues>(key: Key, value: CustomerValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const input = adminOrderUpdateSchema.parse({ customer: values });
      await patchOrder(order.id, input);
      setErrors({});
      pushToast("Контакты заказа сохранены", "success");
      router.refresh();
    } catch (error) {
      const fieldErrors = getZodFieldErrors<keyof CustomerValues>(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        setErrors({ form: getErrorMessage(error, "Не удалось сохранить контакты.") });
      }
      pushToast(getErrorMessage(error, "Не удалось сохранить контакты."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Контактные данные</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Имя, email и телефон получателя заказа.</p>
        </div>
        <Button type="submit" className="rounded-2xl" disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {isSaving ? "Сохраняем" : "Сохранить"}
        </Button>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            className={`field-base ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
            maxLength={80}
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>
        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={`field-base ${errors.email ? "border-red-300 focus:border-red-400" : ""}`}
            maxLength={254}
            type="email"
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </label>
        <label className="label-base">
          <span className="label-title">Телефон</span>
          <input
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className={`field-base ${errors.phone ? "border-red-300 focus:border-red-400" : ""}`}
            maxLength={20}
            inputMode="tel"
          />
          {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
        </label>
      </div>

      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}
    </form>
  );
}

export function AdminOrderAddressForm({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [isClearing, setIsClearing] = useState(false);
  const initialAddress = order.shippingAddress
    ? {
        ...order.shippingAddress,
        id: order.id,
        userId: order.userId ?? "",
        isDefault: false,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }
    : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Адрес доставки заказа</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">Редактируется snapshot адреса внутри заказа.</p>
        </div>
        {order.shippingAddress ? (
          <Button
            type="button"
            variant="secondary"
            className="rounded-2xl"
            disabled={isClearing}
            onClick={async () => {
              setIsClearing(true);
              try {
                await patchOrder(order.id, adminOrderUpdateSchema.parse({ shippingAddress: null }));
                pushToast("Адрес заказа очищен", "success");
                router.refresh();
              } catch (error) {
                pushToast(getErrorMessage(error, "Не удалось очистить адрес."), "error");
              } finally {
                setIsClearing(false);
              }
            }}
          >
            {isClearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Очистить адрес
          </Button>
        ) : null}
      </div>
      <AddressForm
        initialAddress={initialAddress}
        submitLabel="Сохранить адрес заказа"
        showDefaultToggle={false}
        onSubmit={async (input) => {
          await patchOrder(order.id, adminOrderUpdateSchema.parse({ shippingAddress: input }));
          pushToast("Адрес заказа сохранён", "success");
          router.refresh();
        }}
      />
    </div>
  );
}
