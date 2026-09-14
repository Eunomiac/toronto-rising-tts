export type NameAlign = "left" | "center" | "right";

export type NameOffset = {
  readonly ox: number;
  readonly oy: number;
  readonly align: NameAlign;
};
export const formatNameOffsetsClipboard = (
  polar: Readonly<Record<string, NameOffset>>,
  seats: Readonly<Record<string, NameOffset>>
): string => JSON.stringify({ polar, seats }, null, 2);

export const roundOffset = (value: number): number => Math.round(value * 10) / 10;
