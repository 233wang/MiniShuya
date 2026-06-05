import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { type CharacterHitRegion } from "../features/pet/characterAssets";
import { Pet } from "../features/pet/Pet";

export function App() {
  const [systemIdleMillis, setSystemIdleMillis] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const updateSystemIdleMillis = () => {
      void invoke<number>("system_idle_millis").then((idleMillis) => {
        if (!cancelled) {
          setSystemIdleMillis(idleMillis);
        }
      });
    };

    updateSystemIdleMillis();
    const interval = window.setInterval(updateSystemIdleMillis, 1_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const handleDragMove = useCallback((delta: { deltaX: number; deltaY: number }) => {
    void invoke("move_window_by", delta);
  }, []);

  const handleDragEnd = useCallback(() => {
    void invoke("save_current_position");
  }, []);

  const handleExit = useCallback(() => {
    void invoke("exit_app");
  }, []);

  const handleMenuVisibilityChange = useCallback((visible: boolean) => {
    void invoke("set_menu_hit_region_visible", { visible });
  }, []);

  const handleCharacterHitRegionChange = useCallback((region: CharacterHitRegion) => {
    void invoke("set_character_hit_region", { region });
  }, []);

  const handleCharacterFrameChange = useCallback((frameKey: string) => {
    void invoke("set_current_character_frame", { frameKey });
  }, []);

  const readPrimaryMouseDown = useCallback(() => invoke<boolean>("is_primary_mouse_down"), []);

  return (
    <main className="app-shell">
      <Pet
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onExit={handleExit}
        systemIdleMillis={systemIdleMillis}
        readPrimaryMouseDown={readPrimaryMouseDown}
        onCharacterHitRegionChange={handleCharacterHitRegionChange}
        onCharacterFrameChange={handleCharacterFrameChange}
        onMenuVisibilityChange={handleMenuVisibilityChange}
      />
    </main>
  );
}
