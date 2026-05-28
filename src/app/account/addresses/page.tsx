"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import type { UserAddress } from "@/lib/account-types";
import { addressService } from "@/services/address-service";
import { useAuthStore } from "@/store/auth-store";
import { useToastStore } from "@/store/toast-store";
import { AddressCard } from "@/components/address-card";
import { AddressForm } from "@/components/address-form";
import { Button } from "@/components/ui/button";

export default function AccountAddressesPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const pushToast = useToastStore((state) => state.pushToast);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);

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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="card-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Адреса доставки</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Сохраняйте адреса, чтобы быстрее оформлять заказы и переключаться между получателями.
            </p>
          </div>
          <Button className="rounded-2xl" onClick={() => { setIsAdding(true); setEditingAddress(null); }}>
            <Plus className="size-4" />
            Добавить новый адрес
          </Button>
        </div>
      </div>

      {isAdding ? (
        <AddressForm
          submitLabel="Добавить адрес"
          onCancel={() => setIsAdding(false)}
          onSubmit={async (input, isDefault) => {
            await addressService.create(currentUser.id, input, isDefault);
            setAddresses(await addressService.listByUser(currentUser.id));
            setIsAdding(false);
            pushToast("Адрес добавлен");
          }}
        />
      ) : null}

      {editingAddress ? (
        <AddressForm
          initialAddress={editingAddress}
          submitLabel="Сохранить адрес"
          onCancel={() => setEditingAddress(null)}
          onSubmit={async (input, isDefault) => {
            await addressService.update(currentUser.id, editingAddress.id, input, isDefault);
            setAddresses(await addressService.listByUser(currentUser.id));
            setEditingAddress(null);
            pushToast("Изменения сохранены");
          }}
        />
      ) : null}

      {addresses.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => {
                setEditingAddress(address);
                setIsAdding(false);
              }}
              onDelete={async () => {
                await addressService.remove(currentUser.id, address.id);
                setAddresses(await addressService.listByUser(currentUser.id));
              }}
              onSetDefault={async () => {
                await addressService.setDefault(currentUser.id, address.id);
                setAddresses(await addressService.listByUser(currentUser.id));
                pushToast("Изменения сохранены");
              }}
            />
          ))}
        </div>
      ) : (
        <div className="card-panel px-6 py-10 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Адресов пока нет</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Добавьте первый адрес, чтобы он автоматически подставлялся на checkout.
          </p>
        </div>
      )}
    </div>
  );
}
