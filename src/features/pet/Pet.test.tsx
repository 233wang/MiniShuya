import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pet } from "./Pet";

describe("Pet", () => {
  it("renders MiniShuya as an interactive character", () => {
    render(<Pet />);

    expect(screen.getByRole("button", { name: "MiniShuya desktop pet" })).toBeInTheDocument();
    expect(screen.getByTestId("pet-face")).toBeInTheDocument();
    expect(screen.getByTestId("pet-body")).toBeInTheDocument();
  });
});
