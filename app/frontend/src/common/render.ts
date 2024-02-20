import {useCallback} from 'react';

import {useAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {ViewportTransform} from 'state/annotate/render/viewport';

import {drawPolychain, drawDashedLine, drawVertex, drawRect} from 'common/draw';
import {coordinatesImageToCanvas, vertexImageToCanvas} from 'common/geometry';

import type {BaseStyle, DrawStyle, VertexStyle} from 'common/constant';
import type {Coordinates, Vertex, EntityMap} from 'type/annotation';

export function useDrawVertex(transform: ViewportTransform) {
  return useCallback(
    (ctx: CanvasRenderingContext2D, vertex: Vertex, style: VertexStyle) => {
      const coordinates = coordinatesImageToCanvas(vertex.coordinates, transform);
      drawVertex(ctx, coordinates, style);
    },
    [transform]
  );
}

export function useDrawPolychain(transform: ViewportTransform) {
  return useCallback(
    (ctx: CanvasRenderingContext2D, vertices: Vertex[], style: DrawStyle, closed: boolean) => {
      const ps = vertices.map(v => vertexImageToCanvas(v, transform));
      drawPolychain(ctx, ps, style, closed);
    },
    [transform]
  );
}

export function useDrawRect(transform: ViewportTransform) {
  return useCallback(
    (ctx: CanvasRenderingContext2D, p: Coordinates, q: Coordinates, style: BaseStyle) => {
      const p2 = coordinatesImageToCanvas(p, transform);
      const q2 = coordinatesImageToCanvas(q, transform);
      drawRect(ctx, p2, q2, style);
    },
    [transform]
  );
}

export function useDrawDashedLine(transform: ViewportTransform) {
  return useCallback(
    (ctx: CanvasRenderingContext2D, start: Coordinates, end: Coordinates, style: BaseStyle) => {
      const p = coordinatesImageToCanvas(start, transform);
      const q = coordinatesImageToCanvas(end, transform);
      drawDashedLine(ctx, p, q, style);
    },
    [transform]
  );
}

export function useVisibleEntities(): EntityMap {
  const hideUnselected = useRenderStore(s => s.hideUnselected);
  const selectedIds = useRenderStore(s => s.select.ids);
  const interpolatingEntityId = useRenderStore(s => {
    const d = s.manipulate.data;
    return d?.type === 'interpolate' ? d.entityId : undefined;
  });

  return useAnnoStore(
    useCallback(
      s => {
        const entities: EntityMap = {};
        for (const [, e] of Object.entries(s.annotation.entities)) {
          if (hideUnselected && !selectedIds.has(e.id)) {
            continue;
          }
          if (interpolatingEntityId && e.id !== interpolatingEntityId) {
            continue;
          }
          entities[e.id] = e;
        }
        return entities;
      },
      [hideUnselected, selectedIds, interpolatingEntityId]
    )
  );
}
