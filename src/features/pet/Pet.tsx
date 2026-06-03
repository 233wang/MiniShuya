import { useEffect, useState, type PointerEvent } from "react";
import {
  initialPetActionState,
  petActionClass,
  transitionPetActionState,
  type PetActionEvent,
} from "./petActionState";

type PetProps = {
  onDragStart: () => void;
  onDragEnd: () => void;
  onExit: () => void;
};

export const SLEEPY_AFTER_MS = 30_000;

export function Pet({ onDragStart, onDragEnd, onExit }: PetProps) {
  const [actionState, setActionState] = useState(initialPetActionState);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const dispatchAction = (event: PetActionEvent) => {
    setActionState((current) => {
      const awakened =
        current === "sleepy" && event.type !== "IDLE_TIMEOUT"
          ? transitionPetActionState(current, { type: "WAKE" })
          : current;
      return transitionPetActionState(awakened, event);
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      dispatchAction({ type: "IDLE_TIMEOUT" });
    }, SLEEPY_AFTER_MS);

    return () => window.clearTimeout(timeout);
  }, [actionState]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    dispatchAction({ type: "CONTEXT_MENU_CLOSE" });
  };

  const stopDragging = () => {
    dispatchAction({ type: "DRAG_END" });
    onDragEnd();
  };

  const startDragging = () => {
    setIsMenuOpen(false);
    dispatchAction({ type: "DRAG_START" });
    onDragStart();
  };

  const startPetting = (event: PointerEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    dispatchAction({ type: "PETTING_START" });
  };

  const handlePointerLeave = () => {
    if (actionState === "dragging") {
      stopDragging();
      return;
    }

    if (actionState === "petting") {
      dispatchAction({ type: "PETTING_END" });
      return;
    }

    dispatchAction({ type: "POINTER_LEAVE" });
  };

  return (
    <button
      type="button"
      className={`pet ${petActionClass(actionState)}`}
      aria-label="MiniShuya desktop pet"
      onPointerEnter={() => dispatchAction({ type: "POINTER_ENTER" })}
      onPointerLeave={handlePointerLeave}
      onContextMenu={(event) => {
        event.preventDefault();
        setIsMenuOpen(true);
        dispatchAction({ type: "CONTEXT_MENU_OPEN" });
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      }}
      onPointerDown={startDragging}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <span className="pet__shadow" />
      <span className="pet__body" data-testid="pet-body">
        <span className="pet__neck" />
        <span className="pet__dress" />
        <span className="pet__arm pet__arm--left" />
        <span className="pet__arm pet__arm--right" />
      </span>
      <span className="pet__head" data-testid="pet-face" onPointerDown={startPetting}>
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
