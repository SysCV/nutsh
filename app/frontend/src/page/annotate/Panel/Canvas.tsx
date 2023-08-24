import {FC} from 'react';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';
import {ImageLayer} from 'component/panel/ImageLayer';
import {AnnotateLayer} from 'component/panel/AnnotateLayer';
import {ContextMenuMask} from 'component/panel/ContextMenuMask';
import {useCanvasSize} from 'component/panel/layout';

export const Canvas: FC = () => {
  const setHover = useRenderStore(s => s.mouse.setHover);
  const setContextMenuClient = useRenderStore(s => s.mouse.setContextMenuClient);
  const setMouseClient = useUIStore(s => s.setMouseClient);
  const [canvasWidth, canvasHeight] = useCanvasSize();
  return (
    <div
      id="annotate-canvas"
      style={{position: 'relative', overflow: 'hidden', width: canvasWidth, height: canvasHeight}}
      onMouseMove={e => setMouseClient([e.clientX, e.clientY])}
      onContextMenu={e => {
        e.preventDefault();
        setContextMenuClient([e.clientX, e.clientY]);
      }}
      onMouseLeave={() => {
        setContextMenuClient(undefined);
        setHover(undefined);
      }}
    >
      <ImageLayer style={{width: canvasWidth, height: canvasHeight, position: 'absolute', left: 0, top: 0}} />
      <AnnotateLayer style={{width: canvasWidth, height: canvasHeight, position: 'absolute', left: 0, top: 0}} />
      <ContextMenuMask style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}} />
    </div>
  );
};
