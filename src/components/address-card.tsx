"use client";

import { MapPinned, Pencil, Star, Trash2 } from "lucide-react";

import type { UserAddress } from "@/lib/account-types";
import { Button } from "@/components/ui/button";

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: UserAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="card-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <MapPinned className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">{address.recipient}</p>
              {address.isDefault ? (
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white">
                  По умолчанию
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">{address.recipientPhone}</p>
          </div>
        </div>
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
          <Button variant="secondary" className="w-full rounded-2xl sm:w-auto" onClick={onSetDefault}>
            <Star className="size-4" />
            Сделать основным
          </Button>
        ) : null}
        <Button variant="secondary" className="w-full rounded-2xl sm:w-auto" onClick={onEdit}>
          <Pencil className="size-4" />
          Редактировать
        </Button>
        <Button variant="secondary" className="w-full rounded-2xl sm:w-auto" onClick={onDelete}>
          <Trash2 className="size-4" />
          Удалить
        </Button>
      </div>
    </div>
  );
}
