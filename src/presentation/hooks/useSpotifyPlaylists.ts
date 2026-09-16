import { useState, useCallback } from "react";
import { useSpotifyStore } from "@/store/useSpotifyStore";

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
}

export interface SpotifyPlaylistTrack {
  id: string;
  name: string;
  uri: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
}

export function useSpotifyPlaylists() {
  const { isAuthenticated, getAccessToken, logout } = useSpotifyStore();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<SpotifyPlaylistTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<SpotifyPlaylist | null>(null);

  const authFetch = useCallback(
    async (url: string, options?: RequestInit) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No access token");
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(options?.headers as Record<string, string>),
      };
      // Only set Content-Type when there's a body (PUT/POST)
      if (options?.body) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
      }
      const res = await fetch(url, {
        ...options,
        headers,
      });
      if (res.status === 401 || res.status === 403) {
        // 403 can also mean the token was revoked or scopes are insufficient
        const body = await res.text();
        if (res.status === 401) {
          logout();
          throw new Error("Token expired");
        }
        throw new Error(`Spotify API 403: ${body}`);
      }
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Spotify API ${res.status}: ${body}`);
      }
      return res;
    },
    [getAccessToken, logout],
  );

  const fetchPlaylists = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("https://api.spotify.com/v1/me/playlists?limit=50");
      const data = await res.json();
      setPlaylists(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playlists");
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authFetch]);

  const fetchTracks = useCallback(
    async (playlist: SpotifyPlaylist) => {
      if (!isAuthenticated) return;
      setLoading(true);
      setError(null);
      setActivePlaylist(playlist);
      try {
        const res = await authFetch(`https://api.spotify.com/v1/playlists/${playlist.id}`);
        const data = await res.json();

        const allItems: SpotifyPlaylistTrack[] = (data.tracks?.items ?? [])
          .filter((item: { track: SpotifyPlaylistTrack | null }) => item.track && item.track.id)
          .map((item: { track: SpotifyPlaylistTrack }) => item.track);

        // Fetch remaining pages if the playlist has more than 100 tracks
        let nextUrl: string | null = data.tracks?.next ?? null;
        while (nextUrl) {
          const pageRes = await authFetch(nextUrl);
          const pageData = await pageRes.json();
          const page: SpotifyPlaylistTrack[] = (pageData.items ?? [])
            .filter((item: { track: SpotifyPlaylistTrack | null }) => item.track && item.track.id)
            .map((item: { track: SpotifyPlaylistTrack }) => item.track);
          allItems.push(...page);
          nextUrl = pageData.next ?? null;
        }

        setTracks(allItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tracks");
        setTracks([]);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, authFetch],
  );

  const playTrack = useCallback(
    async (uri: string, contextUri?: string, deviceId?: string | null) => {
      if (!isAuthenticated) return;
      try {
        const url = deviceId
          ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
          : "https://api.spotify.com/v1/me/player/play";
        await authFetch(url, {
          method: "PUT",
          body: JSON.stringify(
            contextUri ? { context_uri: contextUri, offset: { uri } } : { uris: [uri] },
          ),
        });
      } catch {
        // silently fail
      }
    },
    [isAuthenticated, authFetch],
  );

  const playPlaylist = useCallback(
    async (playlistId: string, deviceId?: string | null) => {
      if (!isAuthenticated) return;
      try {
        const url = deviceId
          ? `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`
          : "https://api.spotify.com/v1/me/player/play";
        await authFetch(url, {
          method: "PUT",
          body: JSON.stringify({
            context_uri: `spotify:playlist:${playlistId}`,
          }),
        });
      } catch {
        // silently fail
      }
    },
    [isAuthenticated, authFetch],
  );

  const goBack = useCallback(() => {
    setActivePlaylist(null);
    setTracks([]);
    setError(null);
  }, []);

  return {
    playlists,
    tracks,
    loading,
    error,
    activePlaylist,
    fetchPlaylists,
    fetchTracks,
    playTrack,
    playPlaylist,
    goBack,
  };
}
