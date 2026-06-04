import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pet } from "./Pet";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

const renderPet = (props?: Partial<Parameters<typeof Pet>[0]>) =>
  render(
    <Pet
      onDragStart={() => undefined}
      onDragEnd={() => undefined}
      onExit={() => undefined}
      {...props}
    />,
  );

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    renderPet();

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "MiniShuya character" })).toBeInTheDocument();
  });

  it("does not intercept pointer events outside the character and menu", () => {
    renderPet();

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toHaveStyle({
      pointerEvents: "none",
    });
    expect(screen.getByRole("img", { name: "MiniShuya character" })).toHaveStyle({
      pointerEvents: "auto",
    });
  });

  it("calls onDragStart when pointer drag begins", () => {
    const onDragStart = vi.fn();
    renderPet({ onDragStart });

    const character = screen.getByRole("img", { name: "MiniShuya character" });
    fireEvent.pointerDown(character, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(character, { clientX: 24, clientY: 10, pointerId: 1 });

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging while the pointer is held still", () => {
    const onDragStart = vi.fn();
    renderPet({ onDragStart });

    fireEvent.pointerDown(screen.getByRole("img", { name: "MiniShuya character" }), {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });

    expect(onDragStart).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).not.toHaveClass(
      "pet--dragging",
    );
  });

  it("calls onDragEnd when pointer drag ends", () => {
    const onDragEnd = vi.fn();
    renderPet({ onDragEnd });

    const character = screen.getByRole("img", { name: "MiniShuya character" });
    fireEvent.pointerDown(character, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(character, { clientX: 24, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(character, { clientX: 24, clientY: 10, pointerId: 1 });

    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("ends dragging when the native drag operation completes", async () => {
    const drag = deferred();
    const onDragStart = vi.fn(() => drag.promise);
    const onDragEnd = vi.fn();
    renderPet({ onDragStart, onDragEnd });

    const character = screen.getByRole("img", { name: "MiniShuya character" });
    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.pointerDown(character, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(character, { clientX: 24, clientY: 10, pointerId: 1 });

    expect(pet).toHaveClass("pet--dragging");

    await act(async () => {
      drag.resolve();
      await drag.promise;
    });

    await waitFor(() => {
      expect(pet).toHaveClass("pet--idle");
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("shows a cute exit menu on right click", () => {
    renderPet();

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(screen.getByRole("menu", { name: "MiniShuya menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "退出" })).toBeInTheDocument();
  });

  it("calls onExit when the exit menu item is clicked", () => {
    const onExit = vi.fn();
    renderPet({ onExit });

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "退出" }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging when the exit menu item is pressed", () => {
    const onDragStart = vi.fn();
    renderPet({ onDragStart });

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "退出" }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("hides the exit menu when Escape is pressed", () => {
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    fireEvent.keyDown(pet, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "MiniShuya menu" })).not.toBeInTheDocument();
  });

  it("reports native menu hit-region visibility while the menu is open", () => {
    const onMenuVisibilityChange = vi.fn();
    renderPet({ onMenuVisibilityChange });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    fireEvent.keyDown(pet, { key: "Escape" });

    expect(onMenuVisibilityChange).toHaveBeenNthCalledWith(1, true);
    expect(onMenuVisibilityChange).toHaveBeenNthCalledWith(2, false);
  });

  it("reports the rendered character hit region", async () => {
    const onCharacterHitRegionChange = vi.fn();
    renderPet({ onCharacterHitRegionChange });

    const character = screen.getByRole("img", { name: "MiniShuya character" });
    vi.spyOn(character, "getBoundingClientRect").mockReturnValue({
      x: 12.4,
      y: 34.2,
      left: 12.4,
      top: 34.2,
      right: 163.4,
      bottom: 259.2,
      width: 151,
      height: 225,
      toJSON: () => undefined,
    });

    await waitFor(() => {
      expect(onCharacterHitRegionChange).toHaveBeenCalledWith({
        x: 12,
        y: 34,
        width: 151,
        height: 225,
      });
    });
  });

  it("reports the current rendered frame key", async () => {
    const onCharacterFrameChange = vi.fn();
    renderPet({ onCharacterFrameChange });

    await waitFor(() => {
      expect(onCharacterFrameChange).toHaveBeenCalledWith("idle-01");
    });
  });

  it("hides the exit menu when dragging starts", () => {
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    const character = screen.getByRole("img", { name: "MiniShuya character" });
    fireEvent.contextMenu(pet);
    fireEvent.pointerDown(character, { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(character, { clientX: 24, clientY: 10, pointerId: 1 });

    expect(screen.queryByRole("menu", { name: "MiniShuya menu" })).not.toBeInTheDocument();
  });

  it("enters hover state when the pointer enters", () => {
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.pointerEnter(pet);

    expect(pet).toHaveClass("pet--hover");
  });

  it("uses menu-open state while the exit menu is visible", () => {
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);

    expect(pet).toHaveClass("pet--menu-open");
  });

  it("enters petting state when the character image is double clicked", () => {
    const onDragStart = vi.fn();
    renderPet({ onDragStart });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.doubleClick(screen.getByRole("img", { name: "MiniShuya character" }));

    expect(pet).toHaveClass("pet--petting");
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("returns to idle after the petting animation finishes", () => {
    vi.useFakeTimers();
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.doubleClick(screen.getByRole("img", { name: "MiniShuya character" }));

    expect(pet).toHaveClass("pet--petting");
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(pet).toHaveClass("pet--idle");
    vi.useRealTimers();
  });

  it("enters sleepy state after a quiet period", () => {
    vi.useFakeTimers();
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    act(() => {
      vi.advanceTimersByTime(59_000);
    });

    expect(pet).not.toHaveClass("pet--sleepy");
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(pet).toHaveClass("pet--sleepy");
    vi.useRealTimers();
  });

  it("wakes from sleepy state on pointer interaction", () => {
    vi.useFakeTimers();
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    fireEvent.pointerEnter(pet);

    expect(pet).toHaveClass("pet--hover");
    vi.useRealTimers();
  });
});
