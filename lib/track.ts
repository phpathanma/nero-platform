// Medición en el navegador: atribución (ref / UTM) en sessionStorage y envío de eventos a /api/analytics.
// Sin píxeles de terceros: los datos solo van al propio endpoint de NERO.
import { attributionFromSearch, cleanAttribution, type AnalyticsEvent, type Attribution } from "./analytics";

const ATTR_KEY = "nero_attr";
const SESSION_KEY = "nero_sid";

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

// Primer origen de la sesión: si alguien entra por ?ref=promotor-ana, ese ref se conserva hasta registrarse.
export function captureAttribution(search = window.location.search) {
  const incoming = attributionFromSearch(search);
  if (!incoming.ref && !incoming.utmSource && !incoming.utmCampaign) return;
  const store = storage();
  if (store && !store.getItem(ATTR_KEY)) store.setItem(ATTR_KEY, JSON.stringify(incoming));
}

export function getAttribution(): Attribution {
  try { return cleanAttribution(JSON.parse(storage()?.getItem(ATTR_KEY) ?? "null")); } catch { return {}; }
}

export function sessionId() {
  const store = storage();
  let id = store?.getItem(SESSION_KEY);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 24);
    store?.setItem(SESSION_KEY, id);
  }
  return id;
}

// Evento del contexto actual: la página de evento se marca con data-nero-event.
function currentEventId() {
  return document.querySelector<HTMLElement>("[data-nero-event]")?.dataset.neroEvent || undefined;
}

export function track(name: AnalyticsEvent, extra: { eventId?: string } = {}) {
  try {
    const payload = JSON.stringify({ name, path: window.location.pathname, eventId: extra.eventId ?? currentEventId(), sessionId: sessionId(), ...getAttribution() });
    const sent = navigator.sendBeacon?.("/api/analytics", new Blob([payload], { type: "application/json" }));
    if (!sent) void fetch("/api/analytics", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // La medición nunca debe romper la página.
  }
}

// Una sola visita por ruta y sesión: suficiente para el embudo y evita saturar el endpoint.
export function trackPageView(pathname: string) {
  const store = storage();
  const key = `nero_pv:${pathname}`;
  if (store?.getItem(key)) return;
  store?.setItem(key, "1");
  track("page_view");
}
