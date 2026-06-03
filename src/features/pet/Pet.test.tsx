import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });

  it("calls onDragStart when pointer drag begins", () => {
    const onDragStart = vi.fn();
    render(<Pet onDragStart={onDragStart} onDragEnd={() => undefined} onExit={() => undefined} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("calls onDragEnd when pointer drag ends", () => {
    const onDragEnd = vi.fn();
    render(<Pet onDragStart={() => undefined} onDragEnd={onDragEnd} onExit={() => undefined} />);

    fireEvent.pointerUp(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("shows a cute exit menu on right click", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(screen.getByRole("menu", { name: "MiniShuya menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "退出" })).toBeInTheDocument();
  });

  it("calls onExit when the exit menu item is clicked", () => {
    const onExit = vi.fn();
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={onExit} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "退出" }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging when the exit menu item is pressed", () => {
    const onDragStart = vi.fn();
    render(<Pet onDragStart={onDragStart} onDragEnd={() => undefined} onExit={() => undefined} />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "MiniShuya desktop pet" }));
    fireEvent.pointerDown(screen.getByRole("menuitem", { name: "退出" }));

    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("hides the exit menu when Escape is pressed", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    fireEvent.keyDown(pet, { key: "Escape" });

    expect(screen.queryByRole("menu", { name: "MiniShuya menu" })).not.toBeInTheDocument();
  });

  it("hides the exit menu when dragging starts", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} onExit={() => undefined} />);

    const pet = screen.getByRole("button", { name: "MiniShuya desktop pet" });
    fireEvent.contextMenu(pet);
    fireEvent.pointerDown(pet);

    expect(screen.queryByRole("menu", { name: "MiniShuya menu" })).not.toBeInTheDocument();
  });
});
