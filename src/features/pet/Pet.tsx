import { useState } from "react";

type PetMood = "idle" | "dragging";

type PetProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function Pet({ onDragStart, onDragEnd }: PetProps) {
  const [mood, setMood] = useState<PetMood>("idle");

  const stopDragging = () => {
    setMood("idle");
    onDragEnd();
  };

  return (
    <button
      type="button"
      className={`pet pet--${mood}`}
      aria-label="MiniShuya desktop pet"
      onPointerDown={() => {
        setMood("dragging");
        onDragStart();
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onPointerLeave={stopDragging}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face">
        <span className="pet__hair pet__hair--back" />
        <span className="pet__bangs" />
        <span className="pet__eye pet__eye--left" />
        <span className="pet__eye pet__eye--right" />
        <span className="pet__blush pet__blush--left" />
        <span className="pet__blush pet__blush--right" />
        <span className="pet__mouth" />
      </span>
      <span className="pet__leg pet__leg--left" />
      <span className="pet__leg pet__leg--right" />
    </button>
  );
}
