export type TicketCategory = "free_access" | "ga_10pm" | "ga_all_night" | "vip" | "dj_booth" | "custom";

export type TicketTier = {
  id: string;
  category?: TicketCategory;
  name: string;
  price: number;
  capacity: number;
  sold: number;
};

export type TierRow = {
  id: string;
  category: TicketCategory | null;
  name: string;
  price: number | string;
  capacity: number;
  sold: number | null;
};

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  tag: string | null;
  event_date: string;
  event_time: string;
  venue: string;
  city: string;
  status: EventItem["status"];
  accent: string;
  background: string;
  flyer_url: string | null;
  music_url?: string | null;
  lineup: string[] | null;
  schedule: string[] | null;
  ticket_tiers: TierRow[] | null;
};

export type EventItem = {
  id: string;
  slug: string;
  name: string;
  tag: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  status: "published" | "draft" | "past";
  accent: string;
  background: string;
  flyer: string;
  music: string;
  lineup: string[];
  schedule: string[];
  tiers: TicketTier[];
};
