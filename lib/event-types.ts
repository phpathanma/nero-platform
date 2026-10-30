export type TicketCategory = "free_access" | "ga_10pm" | "ga_all_night" | "vip" | "dj_booth" | "custom";

export type TicketTier = {
  id: string;
  category?: TicketCategory;
  name: string;
  price: number;
  capacity: number;
  sold: number;
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
  lineup: string[];
  schedule: string[];
  tiers: TicketTier[];
};
