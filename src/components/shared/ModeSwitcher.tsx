import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/button";

export function ModeSwitcher() {
  const { mode, toggleMode } = useAppStore();

  return (
    <Button
      variant="outline"
      onClick={toggleMode}
      className="fixed bottom-4 right-4 z-50 rounded-full"
    >
      📺 Modo actual: {mode === "winamp" ? "Winamp 2D" : "PS1 3D"}
    </Button>
  );
}
