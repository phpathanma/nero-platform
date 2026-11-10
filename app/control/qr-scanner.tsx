"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

type Result = { status: string; message: string; event?: string; tier?: string; buyer?: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (options: { formats: string[] }) => Detector;
type TorchTrack = { getCapabilities?: () => { torch?: boolean } };
type AudioCtor = typeof AudioContext;

const TOKEN_RE = /^[a-f0-9]{64}$/;
const DECODE_INTERVAL_MS = 125;
const REPEAT_BLOCK_MS = 4000;
const MAX_SIDE = 640;

const TITLES: Record<string, string> = {
  valid: "ENTRADA VÁLIDA",
  already_used: "YA FUE UTILIZADA",
  not_paid: "PAGO NO CONFIRMADO",
};

export function QrScanner() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectorRef = useRef<Detector | null>(null);
  const useJsqrRef = useRef(false);
  const busyRef = useRef(false);
  const overlayRef = useRef(false);
  const decodingRef = useRef(false);
  const lastTokenRef = useRef({ token: "", at: 0 });

  const beep = useCallback((count: number, freq: number) => {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.22;
        osc.frequency.value = freq;
        osc.type = "square";
        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.17);
      }
    } catch { /* audio is best effort */ }
  }, []);

  const dismiss = useCallback(() => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = null;
    overlayRef.current = false;
    setResult(null);
  }, []);

  const showResult = useCallback((res: Result) => {
    const ok = res.status === "valid";
    overlayRef.current = true;
    setResult(res);
    beep(ok ? 1 : 2, ok ? 1400 : 300);
    try { navigator.vibrate?.(ok ? 120 : [200, 100, 200]); } catch { /* not supported */ }
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(dismiss, ok ? 1600 : 3000);
  }, [beep, dismiss]);

  // Shared by camera and manual input. Resolves true when the code was accepted.
  const validate = useCallback(async (token: string): Promise<boolean> => {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    let ok = false;
    try {
      const response = await fetch("/api/control/check-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      let payload: Result;
      try {
        payload = (await response.json()) as Result;
      } catch {
        payload = { status: "error", message: "Respuesta inesperada del servidor." };
      }
      ok = response.ok && payload.status === "valid";
      showResult(payload);
    } catch {
      showResult({ status: "error", message: "No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo." });
    } finally {
      busyRef.current = false;
      setBusy(false);
      router.refresh();
    }
    return ok;
  }, [router, showResult]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    wakeRef.current?.release().catch(() => {});
    wakeRef.current = null;
    setActive(false);
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  const decode = useCallback(async (video: HTMLVideoElement): Promise<string | null> => {
    if (!useJsqrRef.current) {
      try {
        if (!detectorRef.current) {
          const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
          detectorRef.current = new Ctor({ formats: ["qr_code"] });
        }
        const codes = await detectorRef.current.detect(video);
        if (codes[0]?.rawValue) return codes[0].rawValue;
        // Algunos móviles exponen el detector nativo pero no leen QR: si no ve nada, se prueba también con jsQR.
      } catch {
        useJsqrRef.current = true;
      }
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;
    const scale = Math.min(1, MAX_SIDE / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);
    const canvas = canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    return jsQR(img.data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
  }, []);

  const startLoop = useCallback(() => {
    let last = 0;
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || now - last < DECODE_INTERVAL_MS) return;
      if (decodingRef.current || busyRef.current || overlayRef.current || video.readyState < 2) return;
      last = now;
      decodingRef.current = true;
      decode(video)
        .then((value) => {
          const token = value?.trim() ?? "";
          if (!TOKEN_RE.test(token) || busyRef.current || overlayRef.current) return;
          const prev = lastTokenRef.current;
          if (prev.token === token && Date.now() - prev.at < REPEAT_BLOCK_MS) return;
          lastTokenRef.current = { token, at: Date.now() };
          void validate(token);
        })
        .catch(() => {})
        .finally(() => { decodingRef.current = false; });
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [decode, validate]);

  async function startCamera() {
    setCameraError(null);
    // Audio must be unlocked inside the click for iOS.
    try {
      const Ctor: AudioCtor | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
      if (Ctor) {
        audioRef.current = audioRef.current ?? new Ctor();
        void audioRef.current.resume();
      }
    } catch { /* ignore */ }

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("La cámara no está disponible: abre esta página con HTTPS (conexión segura) en un navegador actualizado. Mientras tanto puedes usar el código manual.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stopCamera(); return; }
      video.srcObject = stream;
      await video.play();
      setActive(true);
      const track = stream.getVideoTracks()[0];
      const caps = (track as unknown as TorchTrack).getCapabilities?.();
      setTorchAvailable(Boolean(caps?.torch));
      useJsqrRef.current = !("BarcodeDetector" in window);
      try { wakeRef.current = (await navigator.wakeLock?.request("screen")) ?? null; } catch { /* ignore */ }
      startLoop();
    } catch (error) {
      stopCamera();
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        setCameraError("Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes del navegador (en iPhone: Ajustes > Safari > Cámara, o el icono \"aA\" de la barra de direcciones; en Android: el candado junto a la dirección > Permisos) y vuelve a pulsar ACTIVAR CÁMARA.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") {
        setCameraError("No se encontró ninguna cámara en este dispositivo. Usa el código manual.");
      } else {
        setCameraError("No se pudo iniciar la cámara. Cierra otras apps que la usen e inténtalo de nuevo, o usa el código manual.");
      }
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") stopCamera(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopCamera();
      if (dismissRef.current) clearTimeout(dismissRef.current);
      void audioRef.current?.close().catch(() => {});
    };
  }, [stopCamera]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = inputRef.current?.value.trim();
    if (!token) return;
    const ok = await validate(token);
    if (ok && inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  const ok = result?.status === "valid";

  return <div className="scanner-layout"><section className="scanner-panel cam-panel">
      <div><span className="eyebrow">Control de puerta</span><h2>Validar entrada</h2><p className="muted">Activa la cámara y apunta al QR de la entrada, o usa un lector USB / pega el código. Cada entrada solo se acepta una vez.</p></div>
      <div className="cam-view">
        <video ref={videoRef} className="cam-video" playsInline muted autoPlay style={{ visibility: active ? "visible" : "hidden" }} />
        {active && <div className="cam-guide" aria-hidden="true" />}
        {!active && <button type="button" className="btn cam-start" onClick={startCamera}>ACTIVAR CÁMARA</button>}
        {active && torchAvailable && <button type="button" className="btn cam-torch" onClick={toggleTorch}>{torchOn ? "APAGAR LINTERNA" : "LINTERNA"}</button>}
      </div>
      {cameraError && <div className="notice" role="alert">{cameraError}</div>}
      <form className="scanner-form" onSubmit={submit}><label htmlFor="ticket-token">Código de entrada</label><div><input ref={inputRef} id="ticket-token" name="token" placeholder="Escanea o escribe el código" autoComplete="off" required /><button className="btn" type="submit" disabled={busy}>{busy ? "VALIDANDO…" : "VALIDAR"}</button></div></form>
      {result && <div className={`cam-overlay ${ok ? "cam-ok" : "cam-bad"}`} role="status" onClick={dismiss}>
        <strong>{TITLES[result.status] ?? "NO SE PUDO VALIDAR"}</strong>
        <span>{result.message}</span>
        {(result.buyer || result.tier || result.event) && <small>{[result.buyer, result.tier, result.event].filter(Boolean).join(" · ")}</small>}
        <em>Toca para continuar</em>
      </div>}
    </section><aside className="scanner-help"><span className="eyebrow">Guía rápida</span><h2>En la puerta</h2><ol><li>Pulsa ACTIVAR CÁMARA y apunta al QR dentro del recuadro.</li><li>Espera la respuesta antes de dejar ingresar.</li><li>Si una entrada ya se usó, revisa el detalle con el equipo.</li></ol><div className="notice">La validación requiere conexión a internet y un QR emitido por NERO.</div></aside></div>;
}
