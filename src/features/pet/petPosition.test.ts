import { describe, expect, it } from "vitest";
import { clampPetPosition, defaultPetPosition, isValidPetPosition } from "./petPosition";

describe("pet position helpers", () => {
  it("accepts finite coordinates", () => {
    expect(isValidPetPosition({ x: 120, y: 240 })).toBe(true);
  });

  it("rejects non-finite coordinates", () => {
    expect(isValidPetPosition({ x: Number.NaN, y: 240 })).toBe(false);
    expect(isValidPetPosition({ x: 120, y: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it("uses a stable default position", () => {
    expect(defaultPetPosition()).toEqual({ x: 80, y: 120 });
  });

  it("clamps position into the visible work area", () => {
    expect(
      clampPetPosition(
        { x: -20, y: 9999 },
        { width: 1920, height: 1080 },
        { width: 220, height: 280 },
      ),
    ).toEqual({ x: 0, y: 800 });
  });
});
