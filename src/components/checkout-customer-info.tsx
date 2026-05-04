"use client";

import type { DeliveryMethod, PaymentMethod } from "@/lib/account-types";
import { deliveryMethods, paymentMethods } from "@/lib/account-constants";

type CheckoutCustomerInfoProps = {
  values: {
    name: string;
    email: string;
    phone: string;
    deliveryMethod: DeliveryMethod;
    paymentMethod: PaymentMethod;
    comment: string;
  };
  errors: Partial<Record<"name" | "email" | "phone" | "form", string>>;
  onChange: (field: keyof CheckoutCustomerInfoProps["values"], value: string) => void;
  showDeliverySelector?: boolean;
  externalPaymentRequired?: boolean;
};

export function CheckoutCustomerInfo({
  values,
  errors,
  onChange,
  showDeliverySelector = true,
  externalPaymentRequired = true,
}: CheckoutCustomerInfoProps) {
  return (
    <div className="card-panel p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-slate-900">Контактные данные</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="label-base">
          <span className="label-title">Имя</span>
          <input
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            maxLength={80}
            className={`field-base ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>

        <label className="label-base">
          <span className="label-title">Email</span>
          <input
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            inputMode="email"
            maxLength={254}
            className={`field-base ${errors.email ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.email ? <span className="error-text">{errors.email}</span> : null}
        </label>

        <label className="label-base sm:col-span-2">
          <span className="label-title">Телефон</span>
          <input
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            inputMode="tel"
            maxLength={20}
            className={`field-base ${errors.phone ? "border-red-300 focus:border-red-400" : ""}`}
          />
          {errors.phone ? <span className="error-text">{errors.phone}</span> : null}
        </label>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {showDeliverySelector ? (
          <label className="label-base">
            <span className="label-title">Способ доставки</span>
            <select
              value={values.deliveryMethod}
              onChange={(event) => onChange("deliveryMethod", event.target.value)}
              className="field-base"
            >
              {deliveryMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="label-base">
            <span className="label-title">Доставка</span>
            <div className="field-base flex min-h-[54px] items-center text-sm text-slate-600">
              Доставка не требуется — цифровой сертификат
            </div>
          </div>
        )}

        {externalPaymentRequired ? (
          <label className="label-base">
            <span className="label-title">Способ оплаты</span>
            <select
              value={values.paymentMethod}
              onChange={(event) => onChange("paymentMethod", event.target.value)}
              className="field-base"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="label-base">
            <span className="label-title">Оплата</span>
            <div className="field-base flex min-h-[54px] items-center text-sm text-slate-600">
              Заказ будет полностью оплачен с баланса аккаунта
            </div>
          </div>
        )}
      </div>

      <label className="label-base mt-6">
        <span className="label-title">Комментарий к заказу</span>
        <textarea
          value={values.comment}
          onChange={(event) => onChange("comment", event.target.value)}
          maxLength={280}
          className="field-base textarea-base"
          placeholder="Пожелания по времени доставки, упаковке или связи"
        />
      </label>

      {errors.form ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}
    </div>
  );
}
