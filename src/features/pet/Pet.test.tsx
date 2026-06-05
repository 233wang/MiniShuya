import { act, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pet } from "./Pet";

const renderPet = (props?: Partial<Parameters<typeof Pet>[0]>) =>
  render(
    <Pet
      onDragMove={() => undefined}
      onDragEnd={() => undefined}
      onExit={() => undefined}
      systemIdleMillis={0}
      readPrimaryMouseDown={() => true}
      {...props}
    />,
  );

const firePointerEvent = (
  element: Element,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  options: { clientX: number; clientY: number; pointerId: number; screenX?: number; screenY?: number },
) => {
  const event = createEvent[type](element);
  const eventProperties: PropertyDescriptorMap = {
    clientX: { value: options.clientX },
    clientY: { value: options.clientY },
    pointerId: { value: options.pointerId },
  };

  if (options.screenX !== undefined) {
    eventProperties.screenX = { value: options.screenX };
  }

  if (options.screenY !== undefined) {
    eventProperties.screenY = { value: options.screenY };
  }

  Object.defineProperties(event, eventProperties);
  fireEvent(element, event);
};

const dragPastThreshold = () => {
  const character = screen.getByRole("img", { name: "MiniShuya character" });
  firePointerEvent(character, "pointerDown", {
    clientX: 10,
    clientY: 10,
    screenX: 100,
    screenY: 100,
    pointerId: 1,
  });
  firePointerEvent(character, "pointerMove", {
    clientX: 24,
    clientY: 10,
    screenX: 128,
    screenY: 100,
    pointerId: 1,
  });
  return character;
};

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

  it("moves the window when pointer drag begins", () => {
    const onDragMove = vi.fn();
    renderPet({ onDragMove });

    dragPastThreshold();

    expect(onDragMove).toHaveBeenCalledWith({ deltaX: 28, deltaY: 0 });
  });

  it("falls back to client coordinates when screen coordinates are unavailable", () => {
    const onDragMove = vi.fn();
    renderPet({ onDragMove });

    const character = screen.getByRole("img", { name: "MiniShuya character" });
    firePointerEvent(character, "pointerDown", {
      clientX: 10,
      clientY: 10,
      pointerId: 1,
    });
    firePointerEvent(character, "pointerMove", {
      clientX: 24,
      clientY: 10,
      pointerId: 1,
    });

    expect(onDragMove).toHaveBeenCalledWith({ deltaX: 14, deltaY: 0 });
  });

  it("does not start dragging while the pointer is held still", () => {
    const onDragMove = vi.fn();
    renderPet({ onDragMove });

    firePointerEvent(screen.getByRole("img", { name: "MiniShuya character" }), "pointerDown", {
      clientX: 10,
      clientY: 10,
      screenX: 100,
      screenY: 100,
      pointerId: 1,
    });

    expect(onDragMove).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).not.toHaveClass(
      "pet--dragging",
    );
  });

  it("uses drag recovery when pointer drag ends", async () => {
    const onDragEnd = vi.fn();
    renderPet({ onDragEnd });

    dragPastThreshold();
    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.pointerUp(window);

    await waitFor(() => {
      expect(pet).toHaveClass("pet--draggingRecover");
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("uses drag recovery when the system primary mouse button is released", async () => {
    const onDragEnd = vi.fn();
    let isPrimaryMouseDown = true;
    renderPet({ onDragEnd, readPrimaryMouseDown: () => isPrimaryMouseDown });

    dragPastThreshold();
    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    expect(pet).toHaveClass("pet--dragging");

    isPrimaryMouseDown = false;

    await waitFor(() => {
      expect(pet).toHaveClass("pet--draggingRecover");
    });
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("returns to idle after the drag recovery animation finishes", () => {
    vi.useFakeTimers();
    renderPet();

    dragPastThreshold();
    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.pointerUp(window);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(pet).toHaveClass("pet--idle");
    vi.useRealTimers();
  });

  it("shows a cute exit menu on right click", () => {
    renderPet();

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(screen.getByRole("menu", { name: "MiniShuya menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem")).toBeInTheDocument();
  });

  it("calls onExit when the exit menu item is clicked", () => {
    const onExit = vi.fn();
    renderPet({ onExit });

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.click(screen.getByRole("menuitem"));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging when the exit menu item is pressed", () => {
    const onDragMove = vi.fn();
    renderPet({ onDragMove });

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.pointerDown(screen.getByRole("menuitem"));

    expect(onDragMove).not.toHaveBeenCalled();
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
      expect(onCharacterFrameChange).toHaveBeenCalledWith("greeting-01");
    });
  });

  it("plays the greeting animation once when mounted", () => {
    vi.useFakeTimers();
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    expect(pet).toHaveClass("pet--greeting");

    act(() => {
      vi.advanceTimersByTime(1_500);
    });

    expect(pet).toHaveClass("pet--greeting");

    act(() => {
      vi.advanceTimersByTime(1_100);
    });

    expect(pet).toHaveClass("pet--idle");
    vi.useRealTimers();
  });

  it("hides the exit menu when dragging starts", () => {
    renderPet();

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    dragPastThreshold();

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
    const onDragMove = vi.fn();
    renderPet({ onDragMove });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.doubleClick(screen.getByRole("img", { name: "MiniShuya character" }));

    expect(pet).toHaveClass("pet--petting");
    expect(onDragMove).not.toHaveBeenCalled();
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

  it("enters sleepy state after system idle reaches the threshold", () => {
    const { rerender } = renderPet({ systemIdleMillis: 59_000 });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });

    expect(pet).not.toHaveClass("pet--sleepy");
    rerender(
      <Pet
        onDragMove={() => undefined}
        onDragEnd={() => undefined}
        onExit={() => undefined}
        systemIdleMillis={60_000}
        readPrimaryMouseDown={() => true}
      />,
    );

    expect(pet).toHaveClass("pet--sleepy");
  });

  it("wakes from sleepy state when system activity resumes", () => {
    const { rerender } = renderPet({ systemIdleMillis: 60_000 });

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    expect(pet).toHaveClass("pet--sleepy");

    rerender(
      <Pet
        onDragMove={() => undefined}
        onDragEnd={() => undefined}
        onExit={() => undefined}
        systemIdleMillis={0}
        readPrimaryMouseDown={() => true}
      />,
    );

    expect(pet).toHaveClass("pet--idle");
  });
});
