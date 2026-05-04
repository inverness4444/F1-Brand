"use client";

import { MapPinned, Plus } from "lucide-react";

import type { UserAddress } from "@/lib/account-types";
import { Button } from "@/components/ui/button";

export function CheckoutAddressSelector({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onCreateNew,
}: {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelectAddress: (addressId: string) => void;
  onCreateNew: () => void;
}) {
  return (
    <div className="space-y-4">
      {addresses.length > 0 ? (
        <div className="grid gap-3">
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;

            return (
              <button
                key={address.id}
                type="button"
                onClick={() => onSelectAddress(address.id)}
                className={`rounded-[22px] border p-4 text-left transition ${
                  isSelected
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                    <MapPinned className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{address.recipient}</p>
                      {address.isDefault ? (
                        <span className="rounded-full bg-slate-900 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white">
                          Основной
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {address.city}, {address.street}, дом {address.house}
                      {address.apartment ? `, ${address.apartment}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {address.postalCode} • {address.recipientPhone}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <Button variant="secondary" className="rounded-2xl" onClick={onCreateNew}>
        <Plus className="size-4" />
        Добавить новый адрес
      </Button>
    </div>
  );
}
