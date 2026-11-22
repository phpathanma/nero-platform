const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export type DateParts = { day: string; month: string; weekday: string; year: string };

// Las fechas de evento son fechas de calendario (YYYY-MM-DD), sin zona horaria.
export function eventDateParts(date: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? "");
  if (!match) return null;
  const [, year, month, day] = match;
  const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (value.getUTCMonth() !== Number(month) - 1 || value.getUTCDate() !== Number(day)) return null;
  return { day, month: MONTHS[value.getUTCMonth()], weekday: WEEKDAYS[value.getUTCDay()], year };
}

export function formatEventDate(date: string): string {
  const parts = eventDateParts(date);
  if (!parts) return date;
  const weekday = parts.weekday.charAt(0).toUpperCase() + parts.weekday.slice(1);
  return `${weekday} ${Number(parts.day)} ${parts.month} ${parts.year}`;
}

export function formatEventTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "");
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return time;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "a. m." : "p. m."}`;
}

export function formatPrice(price: number, free = price === 0): string {
  return free ? "GRATIS" : `S/ ${price.toLocaleString("es-PE")}`;
}

// "Desde GRATIS" / "Desde S/ 25" según las entradas que aún tienen cupo.
export function lowestPriceLabel(tiers: { price: number; capacity: number; sold: number }[]): string {
  if (!tiers.length) return "";
  const open = tiers.filter((tier) => tier.capacity - tier.sold > 0);
  return open.length ? `Desde ${formatPrice(Math.min(...open.map((tier) => tier.price)))}` : "Agotado";
}

// Quedan pocas entradas: 15 % del cupo o menos, pero no agotado.
export function isRunningLow(capacity: number, sold: number): boolean {
  const remaining = capacity - sold;
  return capacity > 0 && remaining > 0 && remaining / capacity <= 0.15;
}

// Partículas que se mantienen en minúscula dentro de un nombre («María de la Cruz»).
const NAME_PARTICLES = new Set(["de", "del", "la", "las", "los", "y"]);

// Nombre del titular en Title Case: limpia espacios y capitaliza cada palabra (también tras guion o apóstrofo).
export function titleCaseName(name: string): string {
  return (name ?? "").trim().split(/\s+/).filter(Boolean).map((word, index) => {
    const lower = word.toLocaleLowerCase("es-PE");
    if (index > 0 && NAME_PARTICLES.has(lower)) return lower;
    return lower.split(/([-'’])/).map((part) => part.charAt(0).toLocaleUpperCase("es-PE") + part.slice(1)).join("");
  }).join(" ");
}

// Nombre del PDF descargado: quita tildes (NFD) antes de convertir a slug, así «válido» queda «valido».
export function ticketFileName(brand: string, tier: string): string {
  const slug = (tier ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${brand}-${slug || "entrada"}.pdf`;
}

// Hora de cierre de un evento: las 12:00 (Lima) del día siguiente a su fecha. La fiesta sigue pasada la medianoche,
// así que no se cierra a las 00:00. Debe coincidir con close_past_events() en supabase/event-lifecycle.sql.
export const EVENT_CLOSE_TIME = "12:00";

export type LimaNow = { date: string; time: string };

// Fecha (YYYY-MM-DD) y hora (HH:MM) actuales en Lima, sin importar la zona del servidor.
export function limaNow(now: Date = new Date()): LimaNow {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

// Un evento publicado pasa a «past» a las 12:00 (Lima) del día siguiente a su fecha, aunque en la base siga como published.
export function effectiveStatus<T extends "draft" | "published" | "past">(status: T, date: string, now: LimaNow = limaNow()): T | "past" {
  if (status !== "published" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return status;
  const closeDate = nextDay(date);
  return now.date > closeDate || (now.date === closeDate && now.time >= EVENT_CLOSE_TIME) ? "past" : status;
}
