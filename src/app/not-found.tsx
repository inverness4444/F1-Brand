import Link from "next/link";

import { buttonClassName } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-shell flex min-h-[60vh] items-center justify-center py-16">
      <div className="surface-card max-w-xl rounded-[32px] p-8 text-center">
        <p className="section-kicker">404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Страница не найдена</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Возможно, товар или раздел был перемещён. Вернитесь в каталог и продолжите поиск.
        </p>
        <Link href="/shop" className={buttonClassName({ className: "mt-6" })}>
          Перейти в каталог
        </Link>
      </div>
    </div>
  );
}
