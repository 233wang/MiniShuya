import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet onDragStart={() => undefined} onDragEnd={() => undefined} />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });

  it("calls onDragStart when pointer drag begins", () => {
    const onDragStart = vi.fn();
    render(<Pet onDragStart={onDragStart} onDragEnd={() => undefined} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragStart).toHaveBeenCalledTimes(1);
  });

  it("calls onDragEnd when pointer drag ends", () => {
    const onDragEnd = vi.fn();
    render(<Pet onDragStart={() => undefined} onDragEnd={onDragEnd} />);

    fireEvent.pointerUp(screen.getByRole("button", { name: "MiniShuya desktop pet" }));

    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });
});
