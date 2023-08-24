const hexRgx = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
export function convertHex2RGB(hex: string): [number, number, number] | undefined {
  const result = hexRgx.exec(hex);
  if (!result) return undefined;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function convertRGBA2Hex(r: number, g: number, b: number, a = 255): string {
  const hex = [r, g, b, a]
    .map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    })
    .join('');
  return '#' + hex;
}

// `h`, `s` and `v` are expected to be in range [0, 1].
// Reference: https://stackoverflow.com/a/17243070
export function convertHSV2RGB(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r, g, b;
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    default: // 5
      r = v;
      g = p;
      b = q;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export class ColorGenerator {
  private h: number;
  private s: number;
  private v: number;
  private step: number;

  constructor(s = 1.0, v = 1.0) {
    this.h = Math.random() * 360;
    this.s = s;
    this.v = v;
    this.step = 137.508; // Golden angle in degrees
  }

  public next(): [number, number, number] {
    this.h = (this.h + this.step) % 360;
    return convertHSV2RGB(this.h / 360, this.s, this.v);
  }
}

// https://stackoverflow.com/a/3943023/797225
export function isLightBackground(r: number, g: number, b: number): boolean {
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}
