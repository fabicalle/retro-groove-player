import { useState } from "react";

export function SpotifyConnect() {
  const [state, setState] = useState<"idle" | "connecting" | "connected">(
    "idle",
  );

  const handle = () => {
    if (state === "connected") {
      setState("idle");
      return;
    }
    setState("connecting");
    setTimeout(() => setState("connected"), 1600);
  };

  return (
    <div className="bevel-out p-2 flex items-center gap-2">
      <div className="bevel-in px-2 py-1 flex-1">
        <span className="lcd-text text-sm">
          {state === "idle" && "SPOTIFY :: OFFLINE"}
          {state === "connecting" && (
            <>
              CONNECTING<span className="blink">_</span>
            </>
          )}
          {state === "connected" && "● LINKED · user@spotify"}
        </span>
      </div>
      <button
        onClick={handle}
        className="bevel-btn px-3 py-1 text-xs font-bold text-black hover:brightness-110"
        style={{
          background:
            state === "connected"
              ? "var(--spotify)"
              : "var(--winamp-chrome)",
        }}
      >
        {state === "connected" ? "DISCONNECT" : "CONNECT"}
      </button>
    </div>
  );
}
