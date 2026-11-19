"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isAnalyticsEvent } from "@/lib/analytics";
import { captureAttribution, track, trackPageView } from "@/lib/track";

// El panel, las entradas privadas y la API nunca se miden.
const PRIVATE = /^\/(control|entrada|api)(\/|$)/;

// Captura ?ref / UTM, registra visitas y los clics marcados con data-track="…" (los botones de WhatsApp).
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => { captureAttribution(); }, []);

  useEffect(() => {
    if (!PRIVATE.test(pathname)) trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      const name = target?.dataset.track;
      const eventId = target?.closest<HTMLElement>("[data-nero-event]")?.dataset.neroEvent || undefined;
      if (isAnalyticsEvent(name)) track(name, eventId ? { eventId } : {});
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
