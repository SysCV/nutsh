import {StateCreator} from 'zustand';

import {Annotate} from 'common/constant';
import {deepClone} from 'common/util';
import {findBoundingBox, RectSize} from 'common/geometry';

import type {State} from 'state/annotate/render';
import {Coordinates} from 'type/annotation';

export type ViewportTransform = {
  scale: number;

  // Offset of (0, 0) point (top-left corner) of image w.r.t the (0, 0) point
  // (top-left corner) of the canvas.
  translation: [number, number];
};
export interface ViewportSlice {
  transform: ViewportTransform;
  setTransform: (transform: ViewportTransform) => void;
  focusAreas: (boundaries: Coordinates[][], canvasSize: RectSize) => void;
}

export const createViewportSlice: StateCreator<State, [['zustand/immer', never]], [], ViewportSlice> = set => ({
  transform: {
    scale: 1,
    translation: [0, 0],
  },
  setTransform: (transform: ViewportTransform) => {
    set(s => {
      s.viewport.transform = deepClone(transform);
    });
  },
  focusAreas: (areas: Coordinates[][], canvasSize: RectSize) => {
    set(s => {
      if (areas.length === 0) return;
      const {x, y, width: w, height: h} = findBoundingBox(areas);
      const {width: w0, height: h0} = canvasSize;
      const r = Math.min(Annotate.maxScale, w0 / w, h0 / h) * 0.9;
      const dx = w0 / 2 - r * (x + w / 2);
      const dy = h0 / 2 - r * (y + h / 2);
      s.viewport.transform = {scale: r, translation: [dx, dy]};
    });
  },
});
