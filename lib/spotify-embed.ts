// Carga única de la Spotify IFrame API, compartida por todos los reproductores de la página.
// Spotify llama a window.onSpotifyIframeApiReady una sola vez; aquí se guarda la API y se reparte a quien la pida.

export type SpotifyPlaybackUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } };
export type SpotifyController = {
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  addListener: ((event: "ready", listener: () => void) => void) & ((event: "playback_update", listener: (update: SpotifyPlaybackUpdate) => void) => void);
  destroy: () => void;
};
export type SpotifyApi = {
  createController: (element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void) => void;
};

declare global {
  interface Window { onSpotifyIframeApiReady?: (api: SpotifyApi) => void; neroSpotifyApi?: SpotifyApi }
}

let pending: Promise<SpotifyApi> | null = null;

export function loadSpotifyApi(): Promise<SpotifyApi> {
  if (window.neroSpotifyApi) return Promise.resolve(window.neroSpotifyApi);
  if (pending) return pending;
  pending = new Promise<SpotifyApi>((resolve) => {
    window.onSpotifyIframeApiReady = (api) => { window.neroSpotifyApi = api; resolve(api); };
    if (!document.querySelector("script[data-spotify-api]")) {
      const script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      script.dataset.spotifyApi = "true";
      document.body.appendChild(script);
    }
  });
  return pending;
}
