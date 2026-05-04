"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled application error.");
  }, [error]);

  return (
    <section className="container-shell py-12">
      <div className="card-panel mx-auto max-w-2xl px-6 py-10 text-center sm:px-10">
        <p className="section-kicker">Ошибка</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Что-то пошло не так</h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          Попробуйте повторить действие ещё раз. Если проблема сохранится, обновите страницу или вернитесь позже.
        </p>
        <button type="button" onClick={reset} className="button-base button-primary mt-6 rounded-2xl">
          Попробовать снова
        </button>
      </div>
    </section>
  );
}
