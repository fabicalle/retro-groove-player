/**
 * Playlist — domain model for a Spotify playlist.
 */

export type PlaylistId = string;

export interface Playlist {
  id: PlaylistId;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
  uri: string;
}

export function playlistFromSpotify(item: {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}): Playlist {
  return {
    id: item.id,
    name: item.name,
    images: item.images ?? [],
    tracks: { total: item.tracks?.total ?? 0 },
    owner: { display_name: item.owner?.display_name ?? "" },
    uri: `spotify:playlist:${item.id}`,
  };
}
