/** Lower on the board (smaller UV `v`, larger CSS `top`) paints in front. */
export const TOKEN_STACK_Z_MAX = 1000;

export const tokenStackZIndex = (v: number): number => {
  const clamped = Math.min(1, Math.max(0, v));
  return Math.round((1 - clamped) * TOKEN_STACK_Z_MAX);
};
