import Link from "next/link";
import { saveEvent } from "./actions";
import { TierEditor } from "./tier-editor";

type EventValues = { music_url?: string | null; accent?: string | null; flyer_url?: string | null; id?: string; name?: string; slug?: string; tag?: string; event_date?: string; event_time?: string; venue?: string; city?: string; status?: string; lineup?: string[]; schedule?: string[]; tiers?: { id: string; category: "free_access" | "ga_10pm" | "ga_all_night" | "vip" | "dj_booth" | "custom"; name: string; price: number; capacity: number; sold: number }[] };

const errorMessages: Record<string, string> = {
  capacity: "El cupo no puede ser menor que las entradas ya emitidas.",
  validation: "Revisa el nombre, el enlace, la fecha, la ciudad y los datos de las entradas.",
  save: "No se pudo guardar. Revisa que el enlace no esté usado por otro evento y que las políticas estén aplicadas.",
  music: "El enlace de música debe ser un enlace completo de Spotify, SoundCloud o YouTube. No se guardaron los cambios.",
  "flyer-file": "El afiche debe ser una imagen JPG, PNG o WebP de hasta 4 MB. No se guardaron los cambios.",
  flyer: "El evento se guardó, pero no se pudo subir el afiche. Comprueba que ejecutaste supabase/flyers-storage.sql en Supabase.",
  tier: "El evento se guardó, pero hubo un problema al guardar sus tipos de entrada. Revisa el cupo y las entradas ya vendidas.",
};

export function EventForm({ event, error }: { event?: EventValues; error?: string }) {
  const lines = (items?: string[]) => items?.join("\n") ?? "";
  return <form className="event-form" action={saveEvent}>
    {event?.id && <input type="hidden" name="id" value={event.id} />}
    <div className="form-section"><div><span className="eyebrow">Información del evento</span><h2>Detalles</h2></div>
      <div className="form-grid"><label>Nombre del evento<input name="name" defaultValue={event?.name} required maxLength={100} /></label><label>Enlace<input name="slug" defaultValue={event?.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="nombre-del-evento" /></label><label>Estilo / etiqueta<input name="tag" defaultValue={event?.tag} placeholder="Tech house · Showcase" /></label><label>Ciudad<input name="city" defaultValue={event?.city} required /></label><label>Fecha<input name="event_date" type="date" defaultValue={event?.event_date} required /></label><label>Hora<input name="event_time" type="time" defaultValue={event?.event_time?.slice(0, 5)} required /></label><label className="wide-field">Local<input name="venue" defaultValue={event?.venue} placeholder="Por confirmar" /></label><label>Estado<select name="status" defaultValue={event?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="past">Finalizado</option></select></label><label>Color del evento <span className="muted">(botones y detalles en la web; usa un color claro)</span><input name="accent" type="color" defaultValue={/^#[0-9a-f]{6}$/i.test(event?.accent ?? "") ? event!.accent! : "#d4ff3f"} style={{ height: 46, padding: 4 }} /></label><label className="wide-field">Afiche <span className="muted">(JPG, PNG o WebP, vertical 4:5, por ejemplo 1080 × 1350, hasta 4 MB)</span><input name="flyer" type="file" accept="image/jpeg,image/png,image/webp" /></label>{event?.flyer_url && <div className="wide-field" style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa del afiche guardado */}
          <img src={event.flyer_url} alt="Afiche actual" style={{ width: 96, aspectRatio: "4 / 5", objectFit: "cover", border: "1px solid var(--line)" }} /><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input name="remove_flyer" type="checkbox" style={{ width: 18, height: 18, margin: 0 }} />Quitar el afiche actual</label></div>}<label className="wide-field">Música del evento <span className="muted">(opcional: enlace de un set o playlist en Spotify, SoundCloud o YouTube)</span><input name="music_url" type="url" defaultValue={event?.music_url ?? ""} placeholder="https://soundcloud.com/artista/set" maxLength={300} /></label><label className="wide-field">Artistas <span className="muted">(uno por línea)</span><textarea name="lineup" rows={4} defaultValue={lines(event?.lineup)} placeholder={"Artista principal\nInvitado"} /></label><label className="wide-field">Horarios <span className="muted">(HH:MM | actividad, uno por línea)</span><textarea name="schedule" rows={4} defaultValue={lines(event?.schedule)} placeholder={"22:00 | Apertura de puertas\n23:00 | Artista"} /></label></div>
    </div>
    <TierEditor initialTiers={event?.tiers ?? []} />
    {error && <div className="notice" role="alert">{errorMessages[error] ?? "No se pudo completar la operación."}</div>}
    <div className="form-actions"><button className="btn" type="submit">{event?.id ? "GUARDAR CAMBIOS" : "CREAR EVENTO"}</button><Link className="btn secondary" href="/control/eventos">CANCELAR</Link></div>
  </form>;
}
