import {green, grey} from '@ant-design/colors';
import {convertHex2RGB} from './color';

export const UI = {
  navbarHeight: 64,
  spacing: 16,
  darkBackground: '#141414',
};

export const Annotate = {
  maxScale: 20.0,
  proximityThreshold: 6.0,
};

export interface BaseStyle {
  fill: [number, number, number, number];
  stroke: [number, number, number, number];
  lineWidth: number;
}

export interface VertexStyle extends BaseStyle {
  radius: number;
}

export interface DrawStyle extends BaseStyle {
  vertex: VertexStyle;
}

const grayColor = convertHex2RGB(grey[5])!;
export const SurroundStyle: BaseStyle = {
  stroke: [...grayColor, 255],
  fill: [...grayColor, 64],
  lineWidth: 2,
};

export const EditColor = convertHex2RGB(green[5])!;

export const IdleOpacity = 0.3;
export const FocusOpacity = 0.4;

export function editStyle(color: [number, number, number]): DrawStyle {
  return {
    fill: [...color, Math.floor(255 * FocusOpacity)],
    stroke: [...color, 255],
    lineWidth: 2,
    vertex: {
      stroke: [...color, 255],
      fill: [...color, 255],
      radius: 3,
      lineWidth: 1,
    },
  };
}

export function idleStyle(color: [number, number, number]): DrawStyle {
  return {
    fill: [...color, Math.floor(255 * IdleOpacity)],
    stroke: [...color, Math.floor(255 * FocusOpacity)],
    lineWidth: 2,
    vertex: {
      stroke: [...color, 255],
      fill: [...color, 255],
      radius: 3,
      lineWidth: 1,
    },
  };
}
