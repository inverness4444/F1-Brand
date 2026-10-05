"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { buildCsrfHeaders } from "@/lib/security-utils";

export function NewsletterUnsubscribeForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  async function unsubscribe() {
    setLoading(true);
    try {
      const response = await fetch("/api/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json", ...buildCsrfHeaders() }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Не удалось отменить рассылку.");
      setDone(true); setMessage("Согласия отозваны. Рекламная рассылка отключена.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Попробуйте позже."); }
    finally { setLoading(false); }
  }
  return <div className="space-y-4"><p>Отказ от рекламы не влияет на заказы и сообщения об их исполнении.</p>
    {!done && token ? <Button onClick={unsubscribe} disabled={loading}>{loading ? "Отключаем…" : "Отказаться от рассылки"}</Button> : null}
    {!token ? <p>Чтобы отказаться без ссылки из письма, напишите на <a href="mailto:velocityclub@mail.ru" className="underline">velocityclub@mail.ru</a> с адреса подписки.</p> : null}
    <p role="status">{message}</p></div>;
}
