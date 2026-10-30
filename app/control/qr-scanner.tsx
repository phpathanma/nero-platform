"use client";

import { FormEvent, useRef, useState } from "react";

type Result = { status: string; message: string; event?: string; tier?: string; buyer?: string };

export function QrScanner() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = inputRef.current?.value.trim();
    if (!token) return;
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/control/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const payload = await response.json();
      setResult(payload);
      if (response.ok && inputRef.current) inputRef.current.value = "";
    } catch {
      setResult({ status: "error", message: "No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo." });
    } finally {
      setBusy(false); inputRef.current?.focus();
    }
  }

  return <div className="scanner-layout"><section className="scanner-panel"><div className="scanner-frame"><span className="scanner-corner top-left" /><span className="scanner-corner top-right" /><span className="scanner-corner bottom-left" /><span className="scanner-corner bottom-right" /><span className="scanner-symbol">▦</span></div><div><span className="eyebrow">Control de puerta</span><h2>Validar entrada</h2><p className="muted">Conecta un lector USB o pega el código del QR. La validación se registra en Supabase y cada entrada solo se acepta una vez.</p></div>
      <form className="scanner-form" onSubmit={submit}><label htmlFor="ticket-token">Código de entrada</label><div><input ref={inputRef} id="ticket-token" name="token" placeholder="Escanea o escribe el código" autoComplete="off" autoFocus required /><button className="btn" type="submit" disabled={busy}>{busy ? "VALIDANDO…" : "VALIDAR"}</button></div></form>
      {result && <div className={`scan-result scan-${result.status}`} role="status"><strong>{result.status === "valid" ? "ENTRADA VÁLIDA" : result.status === "already_used" ? "YA FUE UTILIZADA" : result.status === "not_paid" ? "PAGO NO CONFIRMADO" : "NO SE PUDO VALIDAR"}</strong><span>{result.message}</span>{result.event && <small>{result.event}{result.tier ? ` · ${result.tier}` : ""}{result.buyer ? ` · ${result.buyer}` : ""}</small>}</div>}
    </section><aside className="scanner-help"><span className="eyebrow">Guía rápida</span><h2>En la puerta</h2><ol><li>Usa el lector de QR conectado al dispositivo.</li><li>Espera la respuesta antes de dejar ingresar.</li><li>Si una entrada ya se usó, revisa el detalle con el equipo.</li></ol><div className="notice">La validación requiere conexión a internet y un QR emitido por NERO.</div></aside></div>;
}
