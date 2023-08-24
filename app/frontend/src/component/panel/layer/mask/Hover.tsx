import {FC, HTMLAttributes, useRef} from 'react';
import {ComponentProximity} from 'state/annotate/render/mouse';
import {useStore as useBrushCanvasStore} from 'component/segmentation/BrushCanvas';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';
import {relativeMousePosition} from 'common/util';
import {coordinatesCanvasToImage} from 'common/geometry';

type Props = HTMLAttributes<HTMLDivElement> & {
  hover: ComponentProximity;
};

export const Layer: FC<Props> = ({hover, ...divProps}) => {
  const {entityId} = hover;
  const select = useRenderStore(s => s.select.set);
  const setMode = useUIStore(s => s.setMode);
  const setMouseImage = useBrushCanvasStore(s => s.setMouseImage);

  const transform = useRenderStore(s => s.viewport.transform);
  const container = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={container}
      onMouseDown={e => {
        if (e.button !== 0) return;

        select(entityId);
        e.stopPropagation();
      }}
      onMouseUp={e => {
        if (!container.current) {
          return;
        }
        if (e.button !== 0) {
          // only releaseing left button may start editing
          return;
        }
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
          // that any control key being pressed will prevent starting editing this component
          return;
        }

        // set initial mouse position
        const p = relativeMousePosition(e, container.current);
        const q = coordinatesCanvasToImage(p, transform);
        setMouseImage(q);

        // start editing
        setMode('mask');
        e.stopPropagation();
      }}
      {...divProps}
    />
  );
};
