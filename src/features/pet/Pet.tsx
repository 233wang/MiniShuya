import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  actionForPetState,
  minishuyaDefaultCharacter,
  type CharacterHitRegion,
} from "./characterAssets";
import {
  initialPetActionState,
  petActionClass,
  transitionPetActionState,
  type PetActionEvent,
} from "./petActionState";
import { useActionFrames } from "./useActionFrames";

type PetProps = {
  onDragMove: (delta: { deltaX: number; deltaY: number }) => void;
  onDragEnd: () => void;
  onExit: () => void;
  systemIdleMillis: number;
  readPrimaryMouseDown: () => boolean | Promise<boolean>;
  onMenuVisibilityChange?: (visible: boolean) => void;
  onCharacterHitRegionChange?: (region: CharacterHitRegion) => void;
  onCharacterFrameChange?: (frameKey: string) => void;
};

export const SLEEPY_AFTER_MS = 60_000;
const DRAG_START_DISTANCE_PX = 8;
const SLEEPY_REPEAT_MS = 5_000;

type DragCandidate = {
  pointerId: number;
  x: number;
  y: number;
  screenX: number;
  screenY: number;
  dragging: boolean;
};

export function Pet({
  onDragMove,
  onDragEnd,
  onExit,
  systemIdleMillis,
  readPrimaryMouseDown,
  onMenuVisibilityChange,
  onCharacterHitRegionChange,
  onCharacterFrameChange,
}: PetProps) {
  const [actionState, setActionState] = useState(initialPetActionState);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sleepyCycleKey, setSleepyCycleKey] = useState(0);
  const characterRef = useRef<HTMLImageElement>(null);
  const dragCandidateRef = useRef<DragCandidate | null>(null);
  const currentAction = actionForPetState(minishuyaDefaultCharacter, actionState);
  const { frame } = useActionFrames(currentAction, sleepyCycleKey);

  const dispatchAction = (event: PetActionEvent) => {
    setActionState((current) => {
      const awakened =
        current === "sleepy" && event.type !== "IDLE_TIMEOUT"
          ? transitionPetActionState(current, { type: "WAKE" })
          : current;
      return transitionPetActionState(awakened, event);
    });
  };

  const pointerScreenPoint = (event: PointerEvent) => {
    const screenX = Number.isFinite(event.screenX) ? event.screenX : event.clientX;
    const screenY = Number.isFinite(event.screenY) ? event.screenY : event.clientY;

    return { screenX, screenY };
  };

  useEffect(() => {
    if (systemIdleMillis >= SLEEPY_AFTER_MS) {
      dispatchAction({ type: "IDLE_TIMEOUT" });
      return;
    }

    if (actionState === "sleepy") {
      dispatchAction({ type: "WAKE" });
    }
  }, [actionState, systemIdleMillis]);

  useEffect(() => {
    if (actionState !== "sleepy") {
      return undefined;
    }

    setSleepyCycleKey((current) => current + 1);
    const interval = window.setInterval(() => {
      setSleepyCycleKey((current) => current + 1);
    }, SLEEPY_REPEAT_MS);

    return () => window.clearInterval(interval);
  }, [actionState]);

  useEffect(() => {
    if (actionState !== "dragging") {
      return undefined;
    }

    let cancelled = false;

    const pollPrimaryMouse = () => {
      void Promise.resolve(readPrimaryMouseDown()).then((isDown) => {
        if (!cancelled && !isDown) {
          stopDragging();
        }
      });
    };

    pollPrimaryMouse();
    const interval = window.setInterval(pollPrimaryMouse, 40);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [actionState, readPrimaryMouseDown]);

  useEffect(() => {
    if (actionState !== "petting" && actionState !== "draggingRecover") {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      dispatchAction({
        type: actionState === "petting" ? "PETTING_END" : "DRAG_RECOVER_END",
      });
    }, currentAction.frames.length * currentAction.frameDurationMs);

    return () => window.clearTimeout(timeout);
  }, [actionState, currentAction.frameDurationMs, currentAction.frames.length]);

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

  useEffect(() => {
    onCharacterFrameChange?.(frame.key);
  }, [frame.key, onCharacterFrameChange]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dispatchAction({ type: "CONTEXT_MENU_CLOSE" });
  };

  const stopDragging = () => {
    const candidate = dragCandidateRef.current;
    if (!candidate?.dragging && actionState !== "dragging") {
      return;
    }

    dragCandidateRef.current = null;
    dispatchAction({ type: "DRAG_END" });
    onDragEnd();
  };

  const startDraggingState = () => {
    dispatchAction({ type: "DRAG_START" });
  };

  const startPetting = () => {
    dragCandidateRef.current = null;
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dispatchAction({ type: "PETTING_START" });
  };

  const handleCharacterPointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    dragCandidateRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ...pointerScreenPoint(event),
      dragging: false,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort in the test environment.
    }
  };

  const handleCharacterPointerMove = (event: PointerEvent) => {
    const candidate = dragCandidateRef.current;
    if (!candidate || candidate.pointerId !== event.pointerId) {
      return;
    }

    if (candidate.dragging) {
      const point = pointerScreenPoint(event);
      const deltaX = Math.round(point.screenX - candidate.screenX);
      const deltaY = Math.round(point.screenY - candidate.screenY);
      candidate.x = event.clientX;
      candidate.y = event.clientY;
      candidate.screenX = point.screenX;
      candidate.screenY = point.screenY;

      if (deltaX !== 0 || deltaY !== 0) {
        onDragMove({ deltaX, deltaY });
      }
      return;
    }

    const distance = Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y);
    if (distance < DRAG_START_DISTANCE_PX) {
      return;
    }

    const point = pointerScreenPoint(event);
    const deltaX = Math.round(point.screenX - candidate.screenX);
    const deltaY = Math.round(point.screenY - candidate.screenY);
    candidate.x = event.clientX;
    candidate.y = event.clientY;
    candidate.screenX = point.screenX;
    candidate.screenY = point.screenY;
    candidate.dragging = true;
    setIsMenuOpen(false);
    onMenuVisibilityChange?.(false);
    startDraggingState();
    onDragMove({ deltaX, deltaY });
  };

  const handleCharacterPointerUp = (event: PointerEvent) => {
    const candidate = dragCandidateRef.current;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort in the test environment.
    }

    if (candidate?.dragging) {
      stopDragging();
      return;
    }

    dragCandidateRef.current = null;
    dispatchAction({ type: "POINTER_UP" });
  };

  const handlePointerLeave = () => {
    if (actionState === "dragging" || actionState === "petting") {
      return;
    }

    dispatchAction({ type: "POINTER_LEAVE" });
  };

  useEffect(() => {
    const stopActiveDrag = () => {
      stopDragging();
    };

    window.addEventListener("pointerup", stopActiveDrag);
    window.addEventListener("pointercancel", stopActiveDrag);
    window.addEventListener("mouseup", stopActiveDrag);
    window.addEventListener("blur", stopActiveDrag);

    return () => {
      window.removeEventListener("pointerup", stopActiveDrag);
      window.removeEventListener("pointercancel", stopActiveDrag);
      window.removeEventListener("mouseup", stopActiveDrag);
      window.removeEventListener("blur", stopActiveDrag);
    };
  });

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
    >
      <img
        ref={characterRef}
        className="pet__character"
        src={frame.src}
        width={minishuyaDefaultCharacter.size.width}
        height={minishuyaDefaultCharacter.size.height}
        alt="MiniShuya character"
        draggable={false}
        style={{
          pointerEvents: "auto",
        }}
        onDoubleClick={startPetting}
        onPointerDown={handleCharacterPointerDown}
        onPointerMove={handleCharacterPointerMove}
        onPointerUp={handleCharacterPointerUp}
        onPointerCancel={handleCharacterPointerUp}
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
