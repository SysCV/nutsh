import {FC, HTMLAttributes} from 'react';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useEditStore} from 'state/annotate/polychain/edit';
import {Target} from 'state/annotate/polychain/edit';
import {ComponentProximity} from 'state/annotate/render/mouse';
import {PolychainComponent} from 'type/annotation';

export const Layer: FC<
  HTMLAttributes<HTMLDivElement> & {
    component: PolychainComponent;
    hover: ComponentProximity;
  }
> = ({component, hover, ...divProps}) => {
  const {entityId, componentId, vertexIdx, midpointIdx, controlIdx} = hover;

  const edit = useEditStore(s => s.start);
  const editMidpoint = useEditStore(s => s.startMidpoint);
  const editBezier = useEditStore(s => s.startBezier);
  const setSelect = useRenderStore(s => s.select.set);

  return (
    <div
      onMouseDown={e => {
        if (e.button !== 0) return;

        const target: Target = {
          entityId,
          componentId,
          vertices: component.vertices,
        };
        if (vertexIdx !== undefined) {
          if (controlIdx) {
            editBezier(target, vertexIdx, controlIdx);
          } else {
            edit(target, vertexIdx);
          }
        } else if (midpointIdx !== undefined) {
          editMidpoint(target, midpointIdx);
        }
        setSelect(entityId);
        e.stopPropagation();
      }}
      {...divProps}
    />
  );
};
