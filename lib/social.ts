export const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/neroclub_pe/";

// Playlist de NERO; se puede reemplazar desde el entorno si cambia en el futuro.
export const spotifyPlaylistId =
  process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST_ID || "2BkMuAAmpBVGdOKYXCsITu";

export const whatsappUrl =
  process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/51981320296";

export function whatsappLink(message: string) {
  return `${whatsappUrl}?text=${encodeURIComponent(message)}`;
}
