import {FC, HTMLAttributes} from 'react';
import {ComponentProximity} from 'state/annotate/render/mouse';
import {RectangleComponent} from 'type/annotation';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useEditStore, Target} from 'state/annotate/rectangle/edit';

type Props = HTMLAttributes<HTMLDivElement> & {
  component: RectangleComponent;
  hover: ComponentProximity;
};

export const Layer: FC<Props> = ({component, hover, ...divProps}) => {
  const {entityId, componentId, vertexIdx} = hover;

  const start = useEditStore(s => s.start);
  const select = useRenderStore(s => s.select.set);

  return (
    <div
      onMouseDown={e => {
        if (e.button !== 0) return;

        const target: Target = {
          entityId,
          componentId,
          component,
        };
        if (vertexIdx !== undefined) {
          start(target, vertexIdx);
        }

        select(entityId);
        e.stopPropagation();
      }}
      {...divProps}
    />
  );
};
