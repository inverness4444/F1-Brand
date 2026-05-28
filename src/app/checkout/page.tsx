"use client";

import { Loader2, ShoppingBag, WalletCards } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AddressInput, DeliveryMethod, PaymentMethod, UserAddress } from "@/lib/account-types";
import { deliveryMethods, paymentMethods } from "@/lib/account-constants";
import { getErrorMessage, getZodFieldErrors } from "@/lib/form-error-utils";
import { checkoutCustomerSchema } from "@/lib/validation-schemas";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { addressService } from "@/services/address-service";
import { balanceService } from "@/services/balance-service";
import { checkoutService } from "@/services/checkout-service";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useToastStore } from "@/store/toast-store";
import { AddressForm } from "@/components/address-form";
import { CheckoutAddressSelector } from "@/components/checkout-address-selector";
import { CheckoutCustomerInfo } from "@/components/checkout-customer-info";
import { ProductImage } from "@/components/product-image";
import { Button } from "@/components/ui/button";
import { imageByType } from "@/lib/data/products";
import { colorLabelRu, getProductDisplayName, sizeLabelRu } from "@/lib/storefront-text";
import { formatPrice, getProductHref } from "@/lib/utils";

type CheckoutErrors = Partial<Record<"name" | "email" | "phone" | "form", string>>;

function parseMoneyInput(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number.parseInt(digits, 10) : null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { productMap } = useCatalogProducts();
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const pushToast = useToastStore((state) => state.pushToast);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [guestAddress, setGuestAddress] = useState<AddressInput | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [useBalance, setUseBalance] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [requestedBalanceInput, setRequestedBalanceInput] = useState("");
  const [values, setValues] = useState({
    name: currentUser?.name ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? "",
    deliveryMethod: deliveryMethods[0] as DeliveryMethod,
    paymentMethod: paymentMethods[0] as PaymentMethod,
    comment: "",
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSelectedAddressId =
    selectedAddressId ?? addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? null;
  const selectedAddress = addresses.find((address) => address.id === effectiveSelectedAddressId) ?? null;
  const requestedBalanceAmount = parseMoneyInput(requestedBalanceInput);
  const checkoutPreview = useMemo(
    () =>
      checkoutService.buildCheckoutPreview({
        userId: currentUser?.id ?? null,
        selections: cartItems,
        productMap,
        useBalance,
        requestedBalanceAmount,
        availableBalance,
      }),
    [availableBalance, cartItems, currentUser?.id, productMap, requestedBalanceAmount, useBalance],
  );
  const maxBalanceSpend = Math.min(
    checkoutPreview.total,
    checkoutPreview.balanceUsage.availableBalance,
  );

  useEffect(() => {
    if (!currentUser) {
      setAddresses([]);
      setAvailableBalance(0);
      return;
    }

    setValues((current) => ({
      ...current,
      name: current.name || currentUser.name,
      email: current.email || currentUser.email,
      phone: current.phone || currentUser.phone,
    }));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setAvailableBalance(0);
      return;
    }

    let ignore = false;
    void balanceService.getByUserIdUnsafe(currentUser.id).then((balance) => {
      if (!ignore) {
        setAvailableBalance(balance.amount);
      }
    });

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setAddresses([]);
      return;
    }

    let ignore = false;
    void addressService.listByUser(currentUser.id).then((nextAddresses) => {
      if (!ignore) {
        setAddresses(nextAddresses);
      }
    });

    return () => {
      ignore = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!useBalance) {
      return;
    }

    if (maxBalanceSpend <= 0) {
      setUseBalance(false);
      setRequestedBalanceInput("");
      return;
    }

    if (!requestedBalanceInput) {
      setRequestedBalanceInput(String(maxBalanceSpend));
      return;
    }

    if ((requestedBalanceAmount ?? 0) > maxBalanceSpend) {
      setRequestedBalanceInput(String(maxBalanceSpend));
    }
  }, [maxBalanceSpend, requestedBalanceAmount, requestedBalanceInput, useBalance]);

  if (checkoutPreview.items.length === 0) {
    return (
      <section className="container-shell py-12">
        <div className="card-panel flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShoppingBag className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">Корзина пуста</h1>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
            Добавьте товары в корзину, чтобы перейти к оформлению заказа.
          </p>
          <Link href="/shop" className="button-base button-primary mt-5 rounded-2xl">
            Вернуться в каталог
          </Link>
        </div>
      </section>
    );
  }

  const handleCreateAddress = async (input: AddressInput, isDefault: boolean) => {
    if (!currentUser) {
      return;
    }

    const nextAddress = await addressService.create(currentUser.id, input, isDefault);
    setAddresses(await addressService.listByUser(currentUser.id));
    setSelectedAddressId(nextAddress.id);
    setShowNewAddressForm(false);
    pushToast("Адрес добавлен");
  };

  const handleCustomerInfoChange = (field: keyof typeof values, value: string) => {
    if (field === "deliveryMethod" && value === "Курьер" && values.deliveryMethod !== "Курьер") {
      pushToast("Курьерская доставка доступна только в Москве.", "info");
    }

    setValues((current) => ({ ...current, [field]: value }));
  };

  const handlePlaceOrder = async () => {
    const nextErrors: CheckoutErrors = {};
    const customerPayload = checkoutCustomerSchema.safeParse({
      name: values.name,
      email: values.email,
      phone: values.phone,
    });

    if (!customerPayload.success) {
      Object.assign(nextErrors, getZodFieldErrors<"name" | "email" | "phone">(customerPayload.error));
    }

    if (checkoutPreview.requiresShipping && currentUser && !selectedAddress && !showNewAddressForm) {
      nextErrors.form = "Выберите адрес доставки или добавьте новый.";
    }

    if (checkoutPreview.requiresShipping && !currentUser && !guestAddress) {
      nextErrors.form = "Для гостевого заказа сохраните адрес доставки.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const result = await checkoutService.placeOrder(
        {
          userId: currentUser?.id ?? null,
          customer: customerPayload.success ? customerPayload.data : values,
          shippingAddress: checkoutPreview.requiresShipping ? selectedAddress ?? guestAddress : null,
          deliveryMethod: checkoutPreview.requiresShipping ? values.deliveryMethod : null,
          paymentMethod: values.paymentMethod,
          comment: values.comment,
          selections: cartItems,
          useBalance,
          requestedBalanceAmount,
        },
        productMap,
      );

      clearCart();
      if (result.confirmationUrl) {
        pushToast("Заказ создан. Переходим к оплате.");
        window.location.assign(result.confirmationUrl);
        return;
      }

      pushToast("Заказ оформлен");
      router.push(`/checkout/success?order=${encodeURIComponent(result.order.id)}`);
    } catch (error) {
      setErrors({
        form: getErrorMessage(error, "Не удалось оформить заказ."),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="container-shell py-8 sm:py-10">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <div className="card-panel p-5 sm:p-6">
            <p className="section-kicker">Оформление</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Оформление заказа</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              {checkoutPreview.onlyGiftCertificates
                ? "В корзине только цифровые сертификаты: адрес доставки не нужен, а коды появятся сразу после успешного оформления."
                : currentUser
                  ? "Данные аккаунта подтянуты автоматически. Вы можете выбрать сохранённый адрес или добавить новый."
                  : "Оформляйте заказ как гость или создайте аккаунт после покупки, чтобы сохранить историю."}
            </p>
          </div>

          <CheckoutCustomerInfo
            values={values}
            errors={errors}
            onChange={handleCustomerInfoChange}
            showDeliverySelector={checkoutPreview.requiresShipping}
            externalPaymentRequired={checkoutPreview.balanceUsage.amountToPay > 0}
          />

          {checkoutPreview.requiresShipping ? (
            <div className="card-panel p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Адрес доставки</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Выберите сохранённый адрес или добавьте новый прямо во время оформления.
                  </p>
                </div>
              </div>

              {currentUser ? (
                <div className="mt-5 space-y-5">
                  <CheckoutAddressSelector
                    addresses={addresses}
                    selectedAddressId={effectiveSelectedAddressId}
                    onSelectAddress={setSelectedAddressId}
                    onCreateNew={() => setShowNewAddressForm((current) => !current)}
                  />

                  {showNewAddressForm ? (
                    <AddressForm
                      submitLabel="Сохранить адрес"
                      onCancel={() => setShowNewAddressForm(false)}
                      onSubmit={handleCreateAddress}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <p className="helper-text">
                    Для гостевого заказа заполните адрес вручную. После покупки можно будет создать аккаунт.
                  </p>
                  {!guestAddress || showNewAddressForm ? (
                    <AddressForm
                      initialAddress={
                        guestAddress
                          ? {
                              ...guestAddress,
                              id: "guest",
                              userId: "guest",
                              isDefault: false,
                              createdAt: "",
                              updatedAt: "",
                            }
                          : null
                      }
                      submitLabel={guestAddress ? "Обновить адрес заказа" : "Сохранить адрес для заказа"}
                      showDefaultToggle={false}
                      onCancel={guestAddress ? () => setShowNewAddressForm(false) : undefined}
                      onSubmit={async (input) => {
                        setGuestAddress(input);
                        setShowNewAddressForm(false);
                        setErrors({});
                        setValues((current) => ({
                          ...current,
                          name: input.recipient || current.name,
                          phone: input.recipientPhone || current.phone,
                        }));
                        pushToast("Адрес добавлен");
                      }}
                    />
                  ) : (
                    <div className="rounded-[22px] border border-slate-200 bg-white p-5">
                      <p className="text-sm font-semibold text-slate-900">{guestAddress.recipient}</p>
                      <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
                        <p>{guestAddress.recipientPhone}</p>
                        <p>
                          {guestAddress.country}, {guestAddress.city}, {guestAddress.street}, дом {guestAddress.house}
                          {guestAddress.apartment ? `, ${guestAddress.apartment}` : ""}
                        </p>
                        <p>Индекс: {guestAddress.postalCode}</p>
                        {guestAddress.courierComment ? <p>Комментарий: {guestAddress.courierComment}</p> : null}
                      </div>
                      <Button
                        variant="secondary"
                        className="mt-4 rounded-2xl"
                        onClick={() => setShowNewAddressForm(true)}
                      >
                        Изменить адрес
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card-panel p-5 sm:p-6">
              <div className="flex items-start gap-3 rounded-[22px] border border-[#f0dcc9] bg-[#fff6ef] px-4 py-4">
                <WalletCards className="mt-0.5 size-5 text-[#7b2220]" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Доставка не требуется</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    В заказе только цифровые подарочные сертификаты. После оформления вы сразу увидите коды активации на странице успеха.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28 xl:h-fit">
          {currentUser ? (
            <div className="card-panel p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Баланс аккаунта</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Пополняется через подарочные сертификаты и может списываться частично.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                  {formatPrice(checkoutPreview.balanceUsage.availableBalance)}
                </span>
              </div>

              {checkoutPreview.balanceUsage.availableBalance > 0 ? (
                <div className="mt-5 space-y-4">
                  <label className="flex items-start gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={useBalance}
                      onChange={(event) => {
                        const nextValue = event.target.checked;
                        setUseBalance(nextValue);
                        if (nextValue && !requestedBalanceInput) {
                          setRequestedBalanceInput(String(maxBalanceSpend));
                        }
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900"
                    />
                    <span className="text-sm leading-6 text-slate-700">Использовать баланс для оплаты этого заказа</span>
                  </label>

                  {useBalance ? (
                    <label className="label-base">
                      <span className="label-title">Списать с баланса</span>
                      <input
                        inputMode="numeric"
                        value={requestedBalanceInput}
                        onChange={(event) => setRequestedBalanceInput(event.target.value.replace(/[^\d]/g, ""))}
                        className="field-base"
                        placeholder={String(maxBalanceSpend)}
                      />
                      <span className="helper-text">
                        Максимум сейчас: {formatPrice(maxBalanceSpend)}. Баланс нельзя списать больше суммы заказа.
                      </span>
                    </label>
                  ) : null}

                  <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Списывается</span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(checkoutPreview.balanceUsage.amountPaidByBalance)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span>Останется после заказа</span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(checkoutPreview.balanceUsage.balanceAfter)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span>К оплате другим способом</span>
                      <span className="font-semibold text-slate-900">
                        {formatPrice(checkoutPreview.balanceUsage.amountToPay)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                  Баланс пока пуст. Активируйте подарочный сертификат в кабинете, чтобы использовать его при оплате.
                </div>
              )}
            </div>
          ) : (
            <div className="card-panel p-5 sm:p-6">
              <h2 className="text-xl font-semibold text-slate-900">Баланс аккаунта</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Войдите в аккаунт, чтобы активировать сертификаты, хранить баланс и оплачивать заказы частями.
              </p>
              <Link href="/login" className="button-base button-secondary mt-4 rounded-2xl">
                Войти в аккаунт
              </Link>
            </div>
          )}

          <div className="card-panel p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-900">Ваш заказ</h2>
            <div className="mt-5 space-y-4">
              {checkoutPreview.items.map(({ product, selection }) => (
                <div
                  key={`${product.id}-${selection.color}-${selection.size}`}
                  className="flex gap-3 max-[359px]:flex-col"
                >
                  <Link
                    href={getProductHref(product)}
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[18px] bg-slate-50 p-1.5"
                  >
                    <ProductImage
                      src={product.image}
                      fallbackSrc={imageByType[product.type]}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-contain"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={getProductHref(product)} className="line-clamp-2 text-sm font-semibold text-slate-900">
                      {getProductDisplayName(product)}
                    </Link>
                    {product.productType === "gift_certificate" ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[#7b2220]">
                        Digital Gift Card • {selection.quantity} шт.
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        {colorLabelRu[selection.color]} • {sizeLabelRu(selection.size)} • {selection.quantity} шт.
                      </p>
                    )}
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatPrice(product.price * selection.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Подытог</span>
                <span>{formatPrice(checkoutPreview.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Доставка</span>
                <span>
                  {checkoutPreview.requiresShipping
                    ? checkoutPreview.shippingCost === 0
                      ? "Бесплатно"
                      : formatPrice(checkoutPreview.shippingCost)
                    : "Не требуется"}
                </span>
              </div>
              {checkoutPreview.balanceUsage.amountPaidByBalance > 0 ? (
                <div className="flex items-center justify-between text-[#7b2220]">
                  <span>Списывается с баланса</span>
                  <span>− {formatPrice(checkoutPreview.balanceUsage.amountPaidByBalance)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                <span>Итого к оплате</span>
                <span>{formatPrice(checkoutPreview.balanceUsage.amountToPay)}</span>
              </div>
            </div>

            {errors.form ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.form}
              </div>
            ) : null}

            <Button
              fullWidth
              className="mt-5 rounded-2xl"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Оформляем заказ...
                </>
              ) : (
                "Подтвердить заказ"
              )}
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
