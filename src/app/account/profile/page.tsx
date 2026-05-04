"use client";

import { useAuthStore } from "@/store/auth-store";
import { ProfileForm } from "@/components/profile-form";

export default function AccountProfilePage() {
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!currentUser) {
    return null;
  }

  return <ProfileForm user={currentUser} />;
}
