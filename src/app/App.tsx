import { invoke } from "@tauri-apps/api/core";
import { Pet } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    void invoke("start_drag");
  };

  const handleDragEnd = () => {
    void invoke("save_current_position");
  };

  return (
    <main className="app-shell">
      <Pet onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
    </main>
  );
}
