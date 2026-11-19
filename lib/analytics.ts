// Contrato compartido entre el navegador, el endpoint /api/analytics y el SQL (analytics_events_name_check en supabase/analytics.sql).

export const ANALYTICS_EVENTS = ["page_view", "free_access_submit", "whatsapp_click"] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export type Attribution = { ref?: string; utmSource?: string; utmCampaign?: string };

// ref / utm: minúsculas, letras, números, guion y guion bajo, hasta 60 caracteres. Lo demás se descarta.
export function cleanTag(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const tag = value.trim().toLowerCase().replace(/\s+/g, "-");
  return /^[a-z0-9_-]{1,60}$/.test(tag) ? tag : undefined;
}

export function cleanAttribution(value: Partial<Record<keyof Attribution, unknown>> | null | undefined): Attribution {
  return { ref: cleanTag(value?.ref), utmSource: cleanTag(value?.utmSource), utmCampaign: cleanTag(value?.utmCampaign) };
}

export function attributionFromSearch(search: string): Attribution {
  const params = new URLSearchParams(search);
  return cleanAttribution({ ref: params.get("ref"), utmSource: params.get("utm_source"), utmCampaign: params.get("utm_campaign") });
}
