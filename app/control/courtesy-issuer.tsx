"use client";

import { FormEvent, useState } from "react";

type Tier = { id: string; name: string; category: string; price: number; capacity: number; sold: number };

export function CourtesyIssuer({ eventId, tiers, eventStatus }: { eventId: string; tiers: Tier[]; eventStatus: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<{ token: string; emailSent: boolean; guest: string; tier: string } | null>(null);
  const available = tiers.filter((tier) => tier.capacity > tier.sold);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setIssued(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch(`/api/control/eventos/${eventId}/cortesias`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: form.get("tierId"), name: form.get("name"), phone: form.get("phone"), email: form.get("email"), reason: form.get("reason") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo emitir la cortesía.");
      const tier = tiers.find((item) => item.id === form.get("tierId"));
      setIssued({ token: result.token, emailSent: result.emailSent, guest: String(form.get("name")), tier: tier?.name ?? "Entrada" });
      formElement.reset();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo emitir la cortesía."); }
    finally { setBusy(false); }
  }

  return <section className="courtesy-section">
    <div className="module-heading"><div><span className="eyebrow">NERO CONTROL / PRIVADO</span><h2>Emitir cortesía</h2><p className="muted">La cortesía consume cupo en la categoría elegida y no suma ingresos.</p></div></div>
    {eventStatus === "past" ? <div className="notice">No se emiten entradas para eventos finalizados.</div>
      : !available.length ? <div className="module-empty">No hay categorías con cupo. Añade una categoría o aumenta su cupo.</div>
        : <form className="courtesy-form" onSubmit={submit}>
          <label>Categoría<select name="tierId" required>{available.map((tier) => <option key={tier.id} value={tier.id}>{tier.name} · {tier.capacity - tier.sold} disponibles</option>)}</select></label>
          <label>Nombre del invitado<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
          <label>Teléfono<input name="phone" type="tel" required minLength={7} maxLength={30} autoComplete="tel" /></label>
          <label>Correo electrónico<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
          <label className="courtesy-reason">Motivo (opcional)<input name="reason" maxLength={300} placeholder="Artista, prensa, producción…" /></label>
          {error && <div className="notice" role="alert">{error}</div>}
          <button className="btn" type="submit" disabled={busy}>{busy ? "EMITIENDO…" : "EMITIR CORTESÍA Y QR"}</button>
        </form>}
    {issued && <div className="success-note courtesy-success"><b>Cortesía {issued.tier} emitida para {issued.guest}.</b><span>{issued.emailSent ? "Enviamos la entrada al correo del invitado." : "Entrega o descarga la entrada desde el enlace."}</span><a className="btn" target="_blank" rel="noreferrer" href={`/entrada#${issued.token}`}>ABRIR ENTRADA</a></div>}
  </section>;
}
