import { useState } from "react";

type PetMood = "idle" | "dragging";

type PetProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
  onExit: () => void;
};

export function Pet({ onDragStart, onDragEnd, onExit }: PetProps) {
  const [mood, setMood] = useState<PetMood>("idle");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stopDragging = () => {
    setMood("idle");
    onDragEnd();
  };

  const startDragging = () => {
    setIsMenuOpen(false);
    setMood("dragging");
    onDragStart();
  };

  return (
    <button
      type="button"
      className={`pet pet--${mood}`}
      aria-label="MiniShuya desktop pet"
      onContextMenu={(event) => {
        event.preventDefault();
        setIsMenuOpen(true);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsMenuOpen(false);
        }
      }}
      onPointerDown={startDragging}
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
      {isMenuOpen ? (
        <span
          className="pet-menu"
          role="menu"
          aria-label="MiniShuya menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="pet-menu__sparkle" aria-hidden="true" />
          <span className="pet-menu__title">MiniShuya</span>
          <span
            className="pet-menu__item"
            role="menuitem"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onExit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onExit();
              }
            }}
          >
            退出
          </span>
        </span>
      ) : null}
    </button>
  );
}
