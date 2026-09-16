/**
 * Track — the canonical domain model for a single audio track.
 *
 * Independent of any API shape: the infrastructure layer maps Spotify API
 * responses into this entity, and the presentation layer consumes it.
 */

export type TrackId = string;

export interface Artist {
  name: string;
}

export interface Album {
  name: string;
  images: { url: string }[];
}

export interface Track {
  id: TrackId;
  name: string;
  uri: string;
  artists: Artist[];
  album: Album;
  duration_ms: number;
}

/** Build a Track from a Spotify playlist-track API item. */
export function trackFromSpotify(item: {
  id: string | null;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
}): Track | null {
  if (!item.id) return null;
  return {
    id: item.id,
    name: item.name,
    uri: item.uri,
    artists: item.artists ?? [],
    album: {
      name: item.album?.name ?? "",
      images: item.album?.images ?? [],
    },
    duration_ms: item.duration_ms ?? 0,
  };
}

/** Format a duration in ms as M:SS. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
