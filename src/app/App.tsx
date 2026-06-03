import { invoke } from "@tauri-apps/api/core";
import { Pet } from "../features/pet/Pet";

export function App() {
  const handleDragStart = () => {
    void invoke("start_drag");
  };

  return (
    <main className="app-shell">
      <Pet onDragStart={handleDragStart} />
    </main>
  );
}
