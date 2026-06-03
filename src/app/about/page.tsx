import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/info-pages";
import { StructuredData } from "@/components/structured-data";
import { breadcrumbJsonLd, createPageMetadata, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "О магазине",
  path: "/about",
  description:
    "О магазине Velocity Club: одежда и мерч в гоночном стиле, коллекции пилотов, команд, легенд, аксессуары и подарочные сертификаты.",
});

export default function AboutPage() {
  return (
    <div className="pb-16">
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "О магазине", path: "/about" },
          ]),
          webPageJsonLd({
            name: "О магазине",
            description:
              "Velocity Club — интернет-магазин одежды, аксессуаров и подарков в стиле автоспорта.",
            path: "/about",
          }),
        ]}
      />
      <section className="container-shell pt-8">
        <div className="mx-auto max-w-[1180px] border-b border-[var(--line)] pb-8">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "О магазине" },
            ]}
          />
          <p className="section-kicker mt-8">О бренде</p>
          <h1 className="mt-4 max-w-4xl break-words font-[var(--font-heading)] text-4xl font-semibold leading-none tracking-normal text-[#111111] sm:text-5xl lg:text-7xl">
            Velocity Club
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f615f] sm:text-lg">
            Магазин одежды и мерча в гоночном стиле: командные коллекции, капсулы пилотов, аксессуары и подарочные сертификаты в чистой спортивной подаче.
          </p>
        </div>
      </section>

      <section className="container-shell mt-8">
        <div className="mx-auto grid max-w-[1180px] gap-4">
          <section className="rounded-[1.1rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              <h2 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-normal text-[#111111]">
                Подход к магазину
              </h2>
              <div className="space-y-4 text-[0.98rem] leading-8 text-[#5f615f] sm:text-base">
                <p>
                  Velocity Club собран как премиальная e-commerce витрина спортивной одежды: без лишнего шума, с понятной навигацией, рабочим каталогом, фильтрами, карточками товаров, корзиной и личным кабинетом.
                </p>
                <p>
                  В каталоге разделы разделены по смыслу: пилоты, команды, легенды и аксессуары. Это помогает покупателям быстрее находить нужные вещи и не смешивать разные типы коллекций.
                </p>
              </div>
            </div>
          </section>

          <section id="size-guide" className="scroll-mt-28 rounded-[1.1rem] border border-[var(--line)] bg-white p-6 sm:p-8">
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              <h2 className="break-words font-[var(--font-heading)] text-2xl font-semibold tracking-normal text-[#111111]">
                Таблица размеров
              </h2>
              <div className="space-y-4 text-[0.98rem] leading-8 text-[#5f615f] sm:text-base">
                <p>
                  Большинство моделей представлены в размерах XS, S, M, L, XL и XXL. Для аксессуаров и подарочных сертификатов используется один размер.
                </p>
                <p>
                  Подробный выбор размера доступен в карточке товара. Если сомневаетесь между двумя размерами, ориентируйтесь на желаемую посадку: regular ближе к размеру, oversize лучше брать по привычному размеру.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
