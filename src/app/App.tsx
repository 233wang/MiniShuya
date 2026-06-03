import { invoke } from "@tauri-apps/api/core";
import { Pet } from "../features/pet/Pet";

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

  return (
    <main className="app-shell">
      <Pet
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onExit={handleExit}
        onMenuVisibilityChange={handleMenuVisibilityChange}
      />
    </main>
  );
}
