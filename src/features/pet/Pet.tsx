import { useEffect, useState, type PointerEvent } from "react";
import {
  initialPetActionState,
  petActionClass,
  transitionPetActionState,
  type PetActionEvent,
} from "./petActionState";
import { minishuyaDefaultCharacter, petCharacterImageFor } from "./characterAssets";

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

  const startPetting = () => {
    setIsMenuOpen(false);
    dispatchAction({ type: "PETTING_START" });
  };

  const handleCharacterPointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    dispatchAction({ type: "DRAG_START" });
    onDragStart();
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
      style={{
        pointerEvents: "none",
      }}
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
      <img
        className="pet__character"
        src={petCharacterImageFor(actionState)}
        width={minishuyaDefaultCharacter.size.width}
        height={minishuyaDefaultCharacter.size.height}
        alt="MiniShuya character"
        draggable={false}
        style={{
          pointerEvents: "auto",
        }}
        onDoubleClick={startPetting}
        onPointerDown={handleCharacterPointerDown}
      />
      {isMenuOpen ? (
        <span
          className="pet-menu"
          role="menu"
          aria-label="MiniShuya menu"
          style={{
            pointerEvents: "auto",
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
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
