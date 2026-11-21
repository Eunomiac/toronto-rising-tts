/**
 * The GSAP `regionPulse` timeline, applied to the selected district.
 * One two-second pass: sine ease to the peak, then back, then repeat.
 * Fill alpha 0.06→0.12. The glow is a blurred line, 9px to 16px and blur 6→14,
 * drawn twice: halfway between the faint 2px halo and the 16–28px one.
 * The crisp stroke stays 2→3 and shifts from the district red to white.
 */
const STROKE = '#ff6b72';
const PEAK = '#ffffff';
const PERIOD_MS = 2000;

export interface DistrictPulseFrame {
  fillOpacity: number;
  lineWidth: number;
  glowWidth: number;
  glowBlur: number;
  strokeColor: string;
}

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16);
}

export function mixHex(from: string, to: string, amount: number): string {
  const mixed = [0, 1, 2].map((index) => Math.round(
    channel(from, index) + (channel(to, index) - channel(from, index)) * amount,
  ));
  return `#${mixed.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** 0 at the rest pose, 1 at the bright pose, then back. `elapsedMs` is time since the pulse started. */
export function districtPulseAmount(elapsedMs: number): number {
  return (1 - Math.cos((elapsedMs / PERIOD_MS) * Math.PI * 2)) / 2;
}

export function districtPulseFrame(amount: number): DistrictPulseFrame {
  return {
    fillOpacity: 0.06 + (0.12 - 0.06) * amount,
    lineWidth: 2 + amount,
    glowWidth: 9 + (16 - 9) * amount,
    glowBlur: 6 + (14 - 6) * amount,
    strokeColor: mixHex(STROKE, PEAK, amount),
  };
}

export const DISTRICT_GLOW_COLOR = STROKE;
