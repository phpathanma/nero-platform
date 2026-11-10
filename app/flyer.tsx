// Afiche del evento; si aún no se subió, muestra un cartel sobrio con el nombre.
export function Flyer({ src, name, priority = false }: { src?: string; name: string; priority?: boolean }) {
  if (!src) return <div className="flyer flyer-fallback" aria-hidden="true"><span>NERO</span><b>{name}</b></div>;
  // eslint-disable-next-line @next/next/no-img-element -- los afiches se sirven desde Supabase Storage
  return <img className="flyer" src={src} alt={`Afiche de ${name}`} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} />;
}
