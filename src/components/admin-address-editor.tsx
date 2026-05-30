"use client";

import { Loader2, MapPinned, Pencil, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { AddressInput, UserAddress } from "@/lib/account-types";
import { adminAddressUpdateSchema, userAddressSchema } from "@/lib/validation-schemas";
import { buildCsrfHeaders } from "@/lib/security-utils";
import { getErrorMessage } from "@/lib/form-error-utils";
import { useToastStore } from "@/store/toast-store";
import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";

type EditableAddress = UserAddress & {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  shippingOrderCount?: number;
};

async function saveAdminAddress(addressId: string, input: AddressInput, isDefault: boolean) {
  const response = await fetch(`/api/admin/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...buildCsrfHeaders(),
    },
    credentials: "include",
    body: JSON.stringify(adminAddressUpdateSchema.parse({ address: input, isDefault })),
  });
  const payload = (await response.json().catch(() => null)) as { address?: unknown; error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Не удалось сохранить адрес.");
  }

  return userAddressSchema.parse(payload?.address);
}

export function AdminAddressEditor({
  addresses,
  emptyText = "Адресов нет.",
  showUserLinks = false,
}: {
  addresses: EditableAddress[];
  emptyText?: string;
  showUserLinks?: boolean;
}) {
  const router = useRouter();
  const pushToast = useToastStore((state) => state.pushToast);
  const [items, setItems] = useState(addresses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingDefaultId, setSavingDefaultId] = useState<string | null>(null);
  const editingAddress = items.find((address) => address.id === editingId) ?? null;

  const replaceAddress = (address: UserAddress) => {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        ...(item.id === address.id ? address : {}),
        isDefault: item.userId === address.userId ? item.id === address.id && address.isDefault : item.isDefault,
      })),
    );
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {editingAddress ? (
        <AddressForm
          initialAddress={editingAddress}
          submitLabel="Сохранить адрес"
          onCancel={() => setEditingId(null)}
          onSubmit={async (input, isDefault) => {
            const updatedAddress = await saveAdminAddress(editingAddress.id, input, isDefault);
            replaceAddress(updatedAddress);
            setEditingId(null);
            pushToast("Адрес сохранён", "success");
            router.refresh();
          }}
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((address) => (
          <div key={address.id} className="card-panel p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <MapPinned className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{address.recipient}</p>
                    {address.isDefault ? (
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white">
                        Основной
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{address.recipientPhone}</p>
                  {showUserLinks && address.user ? (
                    <Link
                      href={`/admin/users/${address.user.id}`}
                      className="mt-2 inline-flex text-xs font-semibold text-slate-900 underline-offset-4 hover:underline"
                    >
                      {address.user.name} · {address.user.email}
                    </Link>
                  ) : null}
                </div>
              </div>
              {typeof address.shippingOrderCount === "number" ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  В заказах: {address.shippingOrderCount}
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
              <p>{address.country}</p>
              <p>
                {address.city}, {address.street}, дом {address.house}
                {address.apartment ? `, ${address.apartment}` : ""}
              </p>
              <p>Индекс: {address.postalCode}</p>
              {address.courierComment ? <p>Комментарий: {address.courierComment}</p> : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {!address.isDefault ? (
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  disabled={savingDefaultId === address.id}
                  onClick={async () => {
                    setSavingDefaultId(address.id);
                    try {
                      const updatedAddress = await saveAdminAddress(address.id, address, true);
                      replaceAddress(updatedAddress);
                      pushToast("Основной адрес обновлён", "success");
                      router.refresh();
                    } catch (error) {
                      pushToast(getErrorMessage(error, "Не удалось сохранить адрес."), "error");
                    } finally {
                      setSavingDefaultId(null);
                    }
                  }}
                >
                  {savingDefaultId === address.id ? <Loader2 className="size-4 animate-spin" /> : <Star className="size-4" />}
                  Основной
                </Button>
              ) : null}
              <Button variant="secondary" className="rounded-2xl" onClick={() => setEditingId(address.id)}>
                <Pencil className="size-4" />
                Редактировать
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
