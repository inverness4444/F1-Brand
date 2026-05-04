const sections = [
  {
    id: "delivery",
    title: "Доставка",
    body: "Бесплатная доставка от 4000 ₽. Заказы отправляются в аккуратной упаковке с подачей, как у настоящего фирменного магазина.",
  },
  {
    id: "returns",
    title: "Возврат",
    body: "Простой возврат в течение 14 дней после получения, если вещь не была в носке и сохранила исходное состояние.",
  },
  {
    id: "size-guide",
    title: "Таблица размеров",
    body: "Большинство моделей имеют спортивную regular-посадку в размерах от XS до XXL. Подробные размеры доступны и в карточке товара.",
  },
  {
    id: "contact",
    title: "Контакты",
    body: "По вопросам заказа, поддержки или сотрудничества используйте контакты и ссылки, указанные в футере магазина.",
  },
  {
    id: "faq",
    title: "Вопросы и ответы",
    body: "Магазин построен вокруг чистой подачи, рабочего каталога, фильтров, избранного, корзины и коллекционных страниц.",
  },
  {
    id: "privacy",
    title: "Политика конфиденциальности",
    body: "Для этой demo-витрины данные аккаунта и корзины хранятся локально в браузере.",
  },
  {
    id: "terms",
    title: "Пользовательское соглашение",
    body: "Эта витрина представляет собой демо-проект интернет-магазина с локальным хранением пользовательских данных.",
  },
  {
    id: "offer",
    title: "Договор оферты",
    body: "Цены, каталог и данные аккаунта показаны в демонстрационных целях для полного сценария покупки.",
  },
];

export default function AboutPage() {
  return (
    <div className="pb-14">
      <section className="container-shell pt-6">
        <div className="rounded-[2rem] border border-[var(--line)] bg-white px-6 py-8 lg:px-10 lg:py-10">
          <p className="section-kicker">О магазине</p>
          <h1 className="mt-4 font-[var(--font-heading)] text-[clamp(2.2rem,4vw,4.2rem)] font-semibold tracking-[-0.07em] text-[#111111]">
            Витрина магазина одежды в эстетике Formula 1
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-[#5f615f]">
            Apex Store собран как чистый коммерческий магазин одежды, где командные коллекции, капсулы пилотов и базовые модели выглядят как в современном спортивном ритейле.
          </p>
        </div>
      </section>

      <section className="container-shell mt-10 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.id}
            id={section.id}
            className="scroll-mt-28 rounded-[1.4rem] border border-[var(--line)] bg-white p-5"
          >
            <h2 className="font-[var(--font-heading)] text-2xl font-semibold tracking-[-0.05em] text-[#111111]">
              {section.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#5f615f]">{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
