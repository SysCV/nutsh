import intl from 'react-intl-universal';
import shallow from 'zustand/shallow';
import {useStore as useRenderStore} from 'state/annotate/render';
import {PolychainComponent} from 'type/annotation';

import {Action} from './common';
import {useDeletePolychainVertex, useSetPolychainVertexBezier} from 'state/annotate/annotation-broadcast';

export function useActions(component: PolychainComponent): Action[] {
  const {deletePolychainVertex} = useDeletePolychainVertex();
  const {setPolychainVertexBezier} = useSetPolychainVertexBezier();

  const sidx = useRenderStore(s => s.sliceIndex);
  const hover = useRenderStore(s => s.mouse.hover, shallow);
  if (!hover) {
    return [];
  }

  const {entityId: eid, componentId, vertexIdx: vidx} = hover;
  if (vidx === undefined) {
    return [];
  }
  const isVertexBezier = !!component.vertices[vidx].bezier;
  const canTurnBezier = component.closed || vidx > 0;

  return [
    {
      title: intl.get(isVertexBezier ? 'menu.turn_to_normal_vertex' : 'menu.turn_to_bezier_vertex'),
      fn: () =>
        setPolychainVertexBezier({
          sliceIndex: sidx,
          entityId: eid,
          componentId,
          vertexIndex: vidx,
          isBezier: !isVertexBezier,
        }),
      disableReason: canTurnBezier ? undefined : intl.get('menu.warn.disable_polyline_first_vertex_bezier'),
    },
    {
      title: intl.get('menu.delete_point'),
      fn: () =>
        deletePolychainVertex({
          sliceIndex: sidx,
          entityId: eid,
          componentId,
          vertexIndex: vidx,
        }),
      warning: intl.get('menu.warn.delete_point'),
    },
  ];
}
