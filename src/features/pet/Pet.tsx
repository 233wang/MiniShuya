import { useEffect, useRef, useState, type PointerEvent } from "react";
import { minishuyaDefaultCharacter, petCharacterImageFor } from "./characterAssets";
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
  onMenuVisibilityChange?: (visible: boolean) => void;
  onCharacterHitRegionChange?: (region: CharacterHitRegion) => void;
};

export const SLEEPY_AFTER_MS = 30_000;

export type CharacterHitRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function Pet({
  onDragStart,
  onDragEnd,
  onExit,
  onMenuVisibilityChange,
  onCharacterHitRegionChange,
}: PetProps) {
  const [actionState, setActionState] = useState(initialPetActionState);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const characterRef = useRef<HTMLImageElement>(null);

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

  useEffect(() => {
    if (!onCharacterHitRegionChange) {
      return undefined;
    }

    let animationFrame = 0;
    let previousRegion: CharacterHitRegion | undefined;

    const reportRegion = () => {
      const character = characterRef.current;
      if (character) {
        const rect = character.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;
        const region = {
          x: Math.round(rect.left * scale),
          y: Math.round(rect.top * scale),
          width: Math.round(rect.width * scale),
          height: Math.round(rect.height * scale),
        };

        if (
          !previousRegion ||
          previousRegion.x !== region.x ||
          previousRegion.y !== region.y ||
          previousRegion.width !== region.width ||
          previousRegion.height !== region.height
        ) {
          previousRegion = region;
          onCharacterHitRegionChange(region);
        }
      }

      animationFrame = window.requestAnimationFrame(reportRegion);
    };

    reportRegion();

    return () => window.cancelAnimationFrame(animationFrame);
  }, [onCharacterHitRegionChange]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dispatchAction({ type: "CONTEXT_MENU_CLOSE" });
  };

  const stopDragging = () => {
    dispatchAction({ type: "DRAG_END" });
    onDragEnd();
  };

  const startDragging = () => {
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dispatchAction({ type: "DRAG_START" });
    onDragStart();
  };

  const startPetting = () => {
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dispatchAction({ type: "PETTING_START" });
  };

  const handleCharacterPointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
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
        onMenuVisibilityChange?.(true);
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
        ref={characterRef}
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
