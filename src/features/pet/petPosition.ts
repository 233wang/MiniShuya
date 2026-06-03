export type PetPosition = {
  x: number;
  y: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export function defaultPetPosition(): PetPosition {
  return { x: 80, y: 120 };
}

export function isValidPetPosition(position: PetPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

export function clampPetPosition(
  position: PetPosition,
  viewport: ViewportSize,
  petSize: ViewportSize,
): PetPosition {
  const maxX = Math.max(0, viewport.width - petSize.width);
  const maxY = Math.max(0, viewport.height - petSize.height);

  return {
    x: Math.min(Math.max(0, position.x), maxX),
    y: Math.min(Math.max(0, position.y), maxY),
  };
}
