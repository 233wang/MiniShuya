import { invoke } from "@tauri-apps/api/core";
import { Pet, type CharacterHitRegion } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    void invoke("start_drag");
  };

  const handleDragEnd = () => {
    void invoke("save_current_position");
  };

  const handleExit = () => {
    void invoke("exit_app");
  };

  const handleMenuVisibilityChange = (visible: boolean) => {
    void invoke("set_menu_hit_region_visible", { visible });
  };

  const handleCharacterHitRegionChange = (region: CharacterHitRegion) => {
    void invoke("set_character_hit_region", { region });
  };

  return (
    <main className="app-shell">
      <Pet
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onExit={handleExit}
        onCharacterHitRegionChange={handleCharacterHitRegionChange}
        onMenuVisibilityChange={handleMenuVisibilityChange}
      />
    </main>
  );
}
