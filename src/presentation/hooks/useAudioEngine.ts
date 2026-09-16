/**
 * useAudioEngine — wires the DRM-safe FFT engine into the playback lifecycle.
 *
 * - Subscribes to track changes via `useSpotifyStore` + `useSpotifyPlayer`.
 * - On track change: fetches `/v1/audio-features/{id}` + `/v1/audio-analysis/{id}`,
 *   populates `useAudioStore`, and starts the rAF loop.
 * - The rAF loop calls `audioAnalysisEngine.tick(progressMs)` once per frame
 *   and pushes the result into `useAudioStore` (imperative — no React render).
 * - Cleans up the loop on unmount / track change / pause.
 */

import { useEffect, useRef } from "react";
import { useSpotifyStore } from "@/store/useSpotifyStore";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { useAudioStore } from "@/store/useAudioStore";
import { fetchAudioFeatures, fetchAudioAnalysis } from "@/lib/spotify";
import { tick, setData, reset, getData, type AnalysisData } from "@/lib/audioAnalysisEngine";

function extractTrackId(uri: string | undefined | null): string | null {
  if (!uri) return null;
  const parts = uri.split(":");
  return parts.length >= 3 ? parts[2] : null;
}

export function useAudioEngine() {
  const { currentTrack, getAccessToken, isAuthenticated, isPremium } = useSpotifyStore();
  const { isPlaying, position, duration } = useSpotifyPlayer();
  const setAnalysis = useAudioStore((s) => s.setAnalysis);
  const setRunning = useAudioStore((s) => s.setRunning);

  const lastTrackIdRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Start/stop the rAF loop based on playback state.
  useEffect(() => {
    const shouldRun = Boolean(isAuthenticated && isPremium && isPlaying);

    if (shouldRun && rafRef.current === null) {
      setRunning(true);
      const loop = () => {
        const frame = tick(position);
        useAudioStore.getState().setFrame(frame);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else if (!shouldRun && rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setRunning(false);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // `position` is intentionally NOT in the deps: the rAF loop reads the
    // latest value via the component scope, and adding it would restart the
    // loop on every position tick (100ms). The loop is gated by
    // `isPlaying` above, which is the real lifecycle trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isPremium, isPlaying, setRunning]);
  useEffect(() => {
    if (!isAuthenticated || !isPremium) return;

    const trackId = extractTrackId(currentTrack?.uri);
    if (!trackId || trackId === lastTrackIdRef.current) return;
    lastTrackIdRef.current = trackId;

    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;

      const [features, analysis] = await Promise.all([
        fetchAudioFeatures(token, trackId),
        fetchAudioAnalysis(token, trackId),
      ]);

      if (cancelled) return;

      if (!features || !analysis) {
        // Fall back to defaults so the visualizer still animates
        reset();
        setAnalysis(null);
        return;
      }

      const data: AnalysisData = {
        trackId,
        durationMs: features.duration_ms || analysis.track.duration_ms || 0,
        tempo: features.tempo,
        energy: features.energy,
        loudness: features.loudness,
        bars: analysis.bars,
        beats: analysis.beats,
        segments: analysis.segments,
      };
      setData(data);
      setAnalysis(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentTrack?.uri, isAuthenticated, isPremium, getAccessToken, setAnalysis]);

  // When not authenticated / not premium, reset the engine.
  useEffect(() => {
    if (!isAuthenticated || !isPremium) {
      reset();
      lastTrackIdRef.current = null;
    }
  }, [isAuthenticated, isPremium]);

  return {
    isPlaying,
    position,
    duration,
    analysis: getData(),
  };
}
