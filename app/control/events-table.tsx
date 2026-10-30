"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deleteEvent, updateEventStatus } from "./actions";

type EventRow = { id: string; slug: string; name: string; date: string; city: string; status: string; tiers: { sold: number; capacity: number }[] };

export function EventsTable({ events }: { events: EventRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const shown = useMemo(() => events.filter((event) => {
    const matchesQuery = `${event.name} ${event.city}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || event.status === filter);
  }), [events, filter, query]);

  return <>
    <div className="control-toolbar"><input aria-label="Buscar eventos" placeholder="Buscar por evento o ciudad" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filtrar estado" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Todos los estados</option><option value="published">Publicados</option><option value="draft">Borradores</option><option value="past">Finalizados</option></select></div>
    <div className="control-table-wrap"><table><thead><tr><th>Evento</th><th>Fecha</th><th>Ciudad</th><th>Estado</th><th>Entradas</th><th>Acciones</th></tr></thead><tbody>
      {shown.map((event) => <tr key={event.id}><td><b>{event.name}</b><small className="muted">/{event.slug}</small></td><td>{event.date}</td><td>{event.city}</td><td><span className={`status status-${event.status}`}>{event.status === "published" ? "Publicado" : event.status === "past" ? "Finalizado" : "Borrador"}</span></td><td>{event.tiers.reduce((sum, tier) => sum + tier.sold, 0)} / {event.tiers.reduce((sum, tier) => sum + tier.capacity, 0)}</td><td><div className="row-actions"><Link className="text-action" href={`/control/eventos/${event.id}`}>Editar</Link>{event.status === "past" && <a className="text-action" href={`/api/control/eventos/${event.id}/contactos`}>Descargar contactos</a>}{event.status !== "past" && <form action={updateEventStatus}><input type="hidden" name="id" value={event.id} /><input type="hidden" name="status" value={event.status === "published" ? "draft" : "published"} /><button className="text-action" type="submit">{event.status === "published" ? "Retirar" : "Publicar"}</button></form>}<form action={deleteEvent}><input type="hidden" name="id" value={event.id} /><button className="text-action danger" type="submit">Eliminar</button></form></div></td></tr>)}
      {!shown.length && <tr><td colSpan={6}><div className="module-empty">No hay eventos que coincidan con la búsqueda.</div></td></tr>}
    </tbody></table></div>
  </>;
}
