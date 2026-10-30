import { TicketClient } from "./ticket-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tu entrada", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default function TicketPassPage() {
  return <TicketClient />;
}
