"use client";

import { FormEvent, useState } from "react";
import Script from "next/script";

declare global {
  interface Window { turnstile?: { reset: () => void } }
}

export function FreeTicketForm({ tierId }: { tierId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ token: string; emailSent: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/tickets/free", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, name: form.get("name"), phone: form.get("phone"), email: form.get("email"), marketingConsent: form.get("marketing") === "on", captchaToken: form.get("cf-turnstile-response") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo emitir la entrada.");
      setIssued({ token: result.token, emailSent: result.emailSent });
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo emitir la entrada.");
      window.turnstile?.reset();
    } finally { setBusy(false); }
  }

  if (issued) return <div className="success-note free-ticket-success"><b>Tu Free Access está emitido.</b><span>{issued.emailSent ? "Enviamos una copia a tu correo." : "Ábrela ahora y descárgala para tenerla a mano."}</span><a className="btn" href={`/entrada#${issued.token}`} target="_blank" rel="noreferrer">VER Y DESCARGAR ENTRADA</a></div>;

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return <form className="free-ticket-form" onSubmit={submit}>
    {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="free_ticket" data-response-field-name="cf-turnstile-response" /></>}
    <label>Nombre completo<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
    <label>Teléfono<input name="phone" type="tel" autoComplete="tel" placeholder="+51 999 999 999" required minLength={7} maxLength={30} /></label>
    <label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="correo@ejemplo.com" required maxLength={254} /></label>
    <label className="marketing-consent"><input name="marketing" type="checkbox" /><span>Quiero recibir novedades y próximos eventos de NERO. Es opcional.</span></label>
    <p className="muted form-privacy-note">Una entrada por correo para este evento. Usaremos tus datos para emitir la entrada; las novedades solo si aceptas arriba.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    <button className="btn" type="submit" disabled={busy}>{busy ? "EMITIENDO…" : "OBTENER FREE ACCESS"}</button>
  </form>;
}
