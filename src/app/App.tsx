import { invoke } from "@tauri-apps/api/core";
import { type CharacterHitRegion } from "../features/pet/characterAssets";
import { Pet } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    return invoke("start_drag")
      .then(() => undefined)
      .finally(() => {
        void invoke("save_current_position");
      });
  };

  const handleDragEnd = () => undefined;

  const handleExit = () => {
    void invoke("exit_app");
  };

  const handleMenuVisibilityChange = (visible: boolean) => {
    void invoke("set_menu_hit_region_visible", { visible });
  };

  const handleCharacterHitRegionChange = (region: CharacterHitRegion) => {
    void invoke("set_character_hit_region", { region });
  };

  const handleCharacterFrameChange = (frameKey: string) => {
    void invoke("set_current_character_frame", { frameKey });
  };

  return (
    <main className="app-shell">
      <Pet
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onExit={handleExit}
        onCharacterHitRegionChange={handleCharacterHitRegionChange}
        onCharacterFrameChange={handleCharacterFrameChange}
        onMenuVisibilityChange={handleMenuVisibilityChange}
      />
    </main>
  );
}
