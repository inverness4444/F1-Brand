"use client";

export default function GlobalError() {
  return (
    <html lang="ru">
      <body className="bg-[#fbfaf6] font-sans text-[#111111]">
        <section className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12 text-center">
          <div className="w-full rounded-[2rem] border border-[#e2ded6] bg-white px-6 py-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-10">
            <p className="text-sm uppercase tracking-[0.2em] text-[#7b7a75]">Ошибка</p>
            <h1 className="mt-4 text-3xl font-semibold text-slate-900">Не удалось загрузить страницу</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Обновите вкладку или откройте сайт позже. Детали ошибки не показываются из соображений безопасности.
            </p>
          </div>
        </section>
      </body>
    </html>
  );
}
