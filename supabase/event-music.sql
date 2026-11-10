-- Ejecutar una vez (se puede repetir sin problema).
-- Añade a cada evento un enlace opcional de música: un set o playlist de Spotify, SoundCloud o YouTube.
alter table public.events add column if not exists music_url text;
