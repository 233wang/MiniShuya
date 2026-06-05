import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PetCharacterAction } from "./characterAssets";
import { useActionFrames } from "./useActionFrames";

const action = (id: PetCharacterAction["id"], frameDurationMs = 100): PetCharacterAction => ({
  id,
  frameDurationMs,
  loop: true,
  frames: [
    { key: `${id}-01`, src: `${id}-01.png` },
    { key: `${id}-02`, src: `${id}-02.png` },
  ],
});

const oneShotAction = (id: PetCharacterAction["id"], frameDurationMs = 100): PetCharacterAction => ({
  ...action(id, frameDurationMs),
  loop: false,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useActionFrames", () => {
  it("starts on the first frame", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useActionFrames(action("idle")));

    expect(result.current.frame.key).toBe("idle-01");
    expect(result.current.frameIndex).toBe(0);
  });

  it("advances frames by action timing", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useActionFrames(action("idle", 120)));

    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(result.current.frame.key).toBe("idle-02");
  });

  it("resets to the first frame when action changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ currentAction }) => useActionFrames(currentAction),
      { initialProps: { currentAction: action("idle", 100) } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.frame.key).toBe("idle-02");

    rerender({ currentAction: action("petting", 100) });

    expect(result.current.frame.key).toBe("petting-01");
  });

  it("holds on the final frame for non-looping actions", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useActionFrames(oneShotAction("petting", 100)));

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.frame.key).toBe("petting-02");
  });

  it("restarts a non-looping action when reset key changes", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ resetKey }) => useActionFrames(oneShotAction("sleepy", 100), resetKey),
      { initialProps: { resetKey: 0 } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.frame.key).toBe("sleepy-02");

    rerender({ resetKey: 1 });

    expect(result.current.frame.key).toBe("sleepy-01");
  });
});
