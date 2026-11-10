import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/lib/events";

// Las entradas se obtienen ahora desde la página del evento; se mantienen los enlaces antiguos.
export default async function TicketPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEventById(eventId);
  if (!event || event.status !== "published") notFound();
  redirect(`/eventos/${event.slug}#entradas`);
}
