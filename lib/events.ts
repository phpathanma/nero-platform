import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { EventItem } from "./event-types";

const EVENT_SELECT = "id, slug, name, tag, event_date, event_time, venue, city, status, accent, background, flyer_url, lineup, schedule, ticket_tiers(id,category,name,price,capacity,sold)";

function mapEvent(e: any): EventItem {
  return {
    id: e.id, slug: e.slug, name: e.name, tag: e.tag ?? "",
    date: e.event_date, time: e.event_time, venue: e.venue, city: e.city,
    status: e.status, accent: e.accent, background: e.background,
    flyer: e.flyer_url ?? "", lineup: e.lineup ?? [], schedule: e.schedule ?? [],
    tiers: (e.ticket_tiers ?? []).map((tier: any) => ({
      id: tier.id, category: tier.category ?? "custom", name: tier.name, price: Number(tier.price),
      capacity: tier.capacity, sold: tier.sold,
    })),
  };
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

const getCachedEvents = unstable_cache(async (): Promise<EventItem[]> => {
  const supabase = publicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("events").select(EVENT_SELECT).order("event_date", { ascending: true });
  return error || !data ? [] : data.map(mapEvent);
}, ["nero-public-events-v3"], { revalidate: 60, tags: ["events"] });

const getCachedEventBySlug = unstable_cache(async (slug: string): Promise<EventItem | null> => {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("events").select(EVENT_SELECT).eq("slug", slug).maybeSingle();
  if (error) return null;
  return data ? mapEvent(data) : null;
}, ["nero-public-event-by-slug-v2"], { revalidate: 60, tags: ["events"] });

const getCachedEventById = unstable_cache(async (id: string): Promise<EventItem | null> => {
  const supabase = publicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("events").select(EVENT_SELECT).eq("id", id).maybeSingle();
  if (error) return null;
  return data ? mapEvent(data) : null;
}, ["nero-public-event-by-id-v2"], { revalidate: 60, tags: ["events"] });

export async function getEvents(): Promise<EventItem[]> {
  return getCachedEvents();
}

export async function getEventBySlug(slug: string) {
  return getCachedEventBySlug(slug);
}

export async function getEventById(id: string) {
  return getCachedEventById(id);
}
