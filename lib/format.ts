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
