"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";

type TurnstileOptions = { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void };

declare global {
  interface Window { turnstile?: { render: (element: HTMLElement, options: TurnstileOptions) => string; reset: (id?: string) => void; remove: (id: string) => void } }
}

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function FreeTicketForm({ tierId }: { tierId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [issued, setIssued] = useState<{ token: string; emailSent: boolean } | null>(null);
  const widgetBox = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  // Render explícito: el formulario se monta después de cargar la página, así que el modo automático no lo detecta.
  const mountWidget = useCallback(() => {
    if (!turnstileSiteKey || !window.turnstile || !widgetBox.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetBox.current, {
      sitekey: turnstileSiteKey, action: "free_ticket",
      callback: (token) => setCaptcha(token),
      "expired-callback": () => setCaptcha(""),
      "error-callback": () => setCaptcha(""),
    });
  }, []);

  useEffect(() => {
    mountWidget();
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [mountWidget]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/tickets/free", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, name: form.get("name"), phone: form.get("phone"), email: form.get("email"), marketingConsent: form.get("marketing") === "on", captchaToken: captcha }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo emitir la entrada.");
      setIssued({ token: result.token, emailSent: result.emailSent });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo emitir la entrada.");
      setCaptcha("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    } finally { setBusy(false); }
  }

  if (issued) return <div className="success-note free-ticket-success"><b>Tu Free Access está emitido.</b><span>{issued.emailSent ? "Enviamos una copia a tu correo." : "Ábrela ahora y descárgala para tenerla a mano."}</span><a className="btn" href={`/entrada#${issued.token}`} target="_blank" rel="noreferrer">VER Y DESCARGAR ENTRADA</a></div>;

  return <form className="free-ticket-form" onSubmit={submit}>
    <label>Nombre completo<input name="name" autoComplete="name" required minLength={2} maxLength={120} /></label>
    <label>Teléfono<input name="phone" type="tel" autoComplete="tel" placeholder="+51 999 999 999" required minLength={7} maxLength={30} /></label>
    <label>Correo electrónico<input name="email" type="email" autoComplete="email" placeholder="correo@ejemplo.com" required maxLength={254} /></label>
    <label className="marketing-consent"><input name="marketing" type="checkbox" /><span>Quiero recibir novedades y próximos eventos de NERO. Es opcional.</span></label>
    <p className="muted form-privacy-note">Una entrada por correo para este evento. Usamos tus datos para emitir la entrada, según nuestra <Link href="/privacidad" target="_blank">política de privacidad</Link>.</p>
    {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={mountWidget} /><div ref={widgetBox} /></>}
    {error && <div className="notice" role="alert">{error}</div>}
    <button className="btn" type="submit" disabled={busy}>{busy ? "EMITIENDO…" : "OBTENER FREE ACCESS"}</button>
  </form>;
}
