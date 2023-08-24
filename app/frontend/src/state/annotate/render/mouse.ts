import {StateCreator} from 'zustand';

import type {State} from 'state/annotate/render';
import type {EntityId, ComponentId} from 'type/annotation';

export type ProximityDetail = {
  vertexIdx?: number;

  // The index of the vertex whose midpoint to its next vertex is hovered.
  midpointIdx?: number;

  // The index of the control point of a bezier vertex that is hovered.
  controlIdx?: 1 | 2;
};

export type ComponentProximity = {
  entityId: EntityId;
  componentId: ComponentId;
} & ProximityDetail;

export interface MouseSlice {
  hover: ComponentProximity | undefined;
  setHover: (hover: ComponentProximity | undefined) => void;

  contextMenuClient: [number, number] | undefined;
  setContextMenuClient: (contextMenuClient: [number, number] | undefined) => void;
}

export const createMouseSlice: StateCreator<State, [['zustand/immer', never]], [], MouseSlice> = set => ({
  hover: undefined,
  contextMenuClient: undefined,
  mouseClient: undefined,
  setHover: (hover: ComponentProximity | undefined) => {
    set(s => {
      if (!s.mouse.hover) {
        s.mouse.hover = hover;
        return;
      }
      if (!hover) {
        s.mouse.hover = hover;
        return;
      }
      s.mouse.hover = {...hover};
    });
  },
  setContextMenuClient: (contextMenuClient: [number, number] | undefined) => {
    set(s => {
      if (contextMenuClient) {
        // To better match the user intuition, if current hovering componennt is
        // NOT included in the selected ones, we set the selection to the
        // hovering one.
        if (s.mouse.hover && !s.select.ids.has(s.mouse.hover.entityId)) {
          s.select.ids = new Set([s.mouse.hover.entityId]);
        }
      }
      s.mouse.contextMenuClient = contextMenuClient;
    });
  },
});
