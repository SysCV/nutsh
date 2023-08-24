import {FC, CanvasHTMLAttributes, useCallback, useMemo, useState, useEffect} from 'react';
import {v4 as uuidv4} from 'uuid';
import {useStore as useUIStore} from 'state/annotate/ui';
import {ColorPalette} from 'component/panel/entity/display';
import {BrushCanvas, useStore as useBrushStore} from 'component/segmentation/BrushCanvas';
import {useStore as useRenderStore} from 'state/annotate/render';
import {renderMask, useMaskedImageContext, useUpdateMask} from './common';

type Props = CanvasHTMLAttributes<HTMLCanvasElement>;

export const Layer: FC<Props> = ({...canvasProps}) => {
  console.debug('render mask DrawLayer');

  const {imageContext, masks: prevMasks} = useMaskedImageContext();

  // drawing entity
  const selectedEntityId = useRenderStore(s => s.select.ids.values().next().value);
  const [entityId, setEntityId] = useState(selectedEntityId ?? uuidv4());
  useEffect(() => {
    if (selectedEntityId) {
      setEntityId(selectedEntityId);
    }
  }, [selectedEntityId]);

  // brush
  const entityColor = useMemo(() => ColorPalette.get(entityId), [entityId]);
  const transform = useRenderStore(s => s.viewport.transform);

  const updateMask = useUpdateMask(imageContext, prevMasks);
  const setMode = useUIStore(s => s.setMode);
  const confirm = useCallback(() => {
    updateMask();
    if (!selectedEntityId) {
      setEntityId(uuidv4());
    }
  }, [selectedEntityId, updateMask]);

  const isModified = useBrushStore(s => s.isModified);
  const setModified = useBrushStore(s => s.setModified);
  const cancel = useCallback(() => {
    if (isModified) {
      // Must set `globalCompositeOperation` to the drawing mode, i.e. 'destination-over', before resetting.
      const oldGlobalCompositeOperation = imageContext.globalCompositeOperation;
      imageContext.globalCompositeOperation = 'destination-over';

      // reset if there are modifications
      const {width: w, height: h} = imageContext.canvas;
      imageContext.clearRect(0, 0, w, h);
      renderMask(imageContext, prevMasks);
      setModified(false);

      // Set back the original globalCompositeOperation.
      imageContext.globalCompositeOperation = oldGlobalCompositeOperation;
    } else {
      setMode(undefined);
    }
  }, [imageContext, isModified, prevMasks, setMode, setModified]);

  return (
    <BrushCanvas
      imageContext={imageContext}
      brushColor={entityColor}
      transform={transform}
      onConfirm={confirm}
      onCancel={cancel}
      {...canvasProps}
    />
  );
};
