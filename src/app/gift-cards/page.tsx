"use client";

import { CollectionHero } from "@/components/collection-hero";
import { EmptyCatalogState } from "@/components/empty-catalog-state";
import { NewsletterSection } from "@/components/newsletter-section";
import { ProductGrid } from "@/components/product-grid";
import { StructuredData } from "@/components/structured-data";
import { useCatalogProducts } from "@/hooks/use-catalog-products";
import { breadcrumbJsonLd, faqJsonLd, webPageJsonLd } from "@/lib/seo";

const faqItems = [
  {
    question: "Как работает сертификат?",
    answer:
      "Купите цифровой сертификат как обычный товар. После успешного оформления заказа система создаст уникальный код, который можно активировать в личном кабинете.",
  },
  {
    question: "Можно ли использовать частично?",
    answer:
      "Да. Если сумма заказа меньше доступного баланса, будет списана только нужная часть, а остаток сохранится в аккаунте.",
  },
  {
    question: "Что будет с остатком?",
    answer:
      "Остаток остаётся на балансе аккаунта и отображается в разделе «Баланс и сертификаты» до следующей покупки.",
  },
  {
    question: "Можно ли активировать два сертификата?",
    answer:
      "Да. На один аккаунт можно активировать несколько сертификатов, и их суммы будут суммироваться в общем балансе.",
  },
  {
    question: "Можно ли вернуть сертификат?",
    answer:
      "Пока магазин работает в mock-режиме, интерфейс возврата сертификатов не подключён. При интеграции backend это правило должно быть дополнено юридическими условиями магазина.",
  },
  {
    question: "Есть ли срок действия?",
    answer:
      "Сейчас сертификаты создаются без срока действия. Если в будущем появится дата окончания, система автоматически не даст активировать просроченный код.",
  },
] as const;

export default function GiftCardsPage() {
  const { hasHydrated, products } = useCatalogProducts();
  const giftCards = products.filter((product) => product.productType === "gift_certificate");

  return (
    <div className="pb-14">
      <StructuredData
        data={[
          breadcrumbJsonLd([
            { name: "Главная", path: "/" },
            { name: "Подарочные сертификаты", path: "/gift-cards" },
          ]),
          webPageJsonLd({
            name: "Подарочные сертификаты Apex Store",
            description:
              "Цифровые подарочные сертификаты для покупки одежды, аксессуаров и мерча в гоночном стиле.",
            path: "/gift-cards",
          }),
          faqJsonLd(faqItems),
        ]}
      />
      <CollectionHero
        eyebrow="Подарочные сертификаты"
        title="Подарите выбор"
        description="Сертификат можно активировать в личном кабинете и использовать для оплаты любых товаров. Баланс сохраняет остаток и подходит для частичной оплаты следующих заказов."
      />

      <section className="container-shell mt-10">
        <ProductGrid
          products={giftCards}
          empty={
            hasHydrated ? (
              <EmptyCatalogState title="Подарочные сертификаты пока недоступны" compact />
            ) : (
              <div className="rounded-[1.8rem] border border-[var(--line)] bg-white p-8 text-center text-sm text-[#5f615f]">
                Синхронизируем каталог...
              </div>
            )
          }
        />
      </section>

      <section className="container-shell mt-12">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white p-5 sm:p-6 lg:p-8">
          <p className="section-kicker">FAQ</p>
          <h2 className="mt-3 font-[var(--font-heading)] text-[clamp(1.9rem,6vw,2.6rem)] font-semibold tracking-[-0.06em] text-[#111111]">
            Частые вопросы
          </h2>

          <div className="mt-6 space-y-3">
            {faqItems.map((item) => (
              <details key={item.question} className="rounded-[1.3rem] border border-[var(--line)] bg-[#fbfaf6] px-4 py-4 sm:px-5">
                <summary className="cursor-pointer text-sm font-semibold text-[#111111] sm:text-base">
                  {item.question}
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f615f] sm:text-[0.98rem] sm:leading-8">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <NewsletterSection />
    </div>
  );
}
