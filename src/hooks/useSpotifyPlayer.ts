import { useEffect, useState, useRef } from "react";
import { useSpotifyStore } from "../store/useSpotifyStore";

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Spotify: any;
  }
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  track_window: {
    current_track: {
      name: string;
      artists: { name: string }[];
      album: { images: { url: string }[] };
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpotifyPlayer = any;

export function useSpotifyPlayer() {
  const { isAuthenticated, setTrack, getAccessToken } = useSpotifyStore();
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const initPlayer = () => {
      // Don't create a second player if one exists
      if (playerRef.current) return;

      const player = new window.Spotify.Player({
        name: "Y2K Retro Player",
        getOAuthToken: async (cb: (token: string) => void) => {
          const token = await getAccessToken();
          if (token) cb(token);
        },
        volume: 0.75,
      });

      playerRef.current = player;

      player.addListener("ready", async ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setIsReady(true);

        const token = await getAccessToken();
        if (token) {
          fetch("https://api.spotify.com/v1/me/player", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              device_ids: [device_id],
              play: false,
            }),
          }).catch(() => {});
        }
      });

      player.addListener("not_ready", () => {
        setIsReady(false);
      });

      player.addListener("player_state_changed", (state: SpotifyPlaybackState) => {
        if (!state) return;
        setTrack(state.track_window.current_track);
        setIsPlaying(!state.paused);
        setPosition(state.position);
        setDuration(state.duration);
        setShuffle(state.shuffle);
      });

      player.connect();
    };

    // If SDK is already loaded, init immediately
    if (window.Spotify?.Player) {
      initPlayer();
    }

    // Also set the callback for when the script finishes loading
    window.onSpotifyWebPlaybackSDKReady = initPlayer;

    // Only add the SDK script once
    if (!document.getElementById("spotify-player-script")) {
      const script = document.createElement("script");
      script.id = "spotify-player-script";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [isAuthenticated, setTrack, getAccessToken]);

  const play = () => playerRef.current?.resume();
  const pause = () => playerRef.current?.pause();
  const next = () => playerRef.current?.nextTrack();
  const prev = () => playerRef.current?.previousTrack();
  const setVolume = (vol: number) => playerRef.current?.setVolume(vol / 100);
  const toggleShuffle = async () => {
    const token = await getAccessToken();
    if (!token) return;
    const newState = !shuffle;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newState}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      setShuffle(newState);
    } catch {
      // silently fail
    }
  };

  return {
    player: playerRef.current,
    isReady,
    deviceId,
    isPlaying,
    position,
    duration,
    shuffle,
    play,
    pause,
    next,
    prev,
    setVolume,
    toggleShuffle,
  };
}
