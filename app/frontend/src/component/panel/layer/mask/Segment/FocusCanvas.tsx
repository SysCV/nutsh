import {FC, CanvasHTMLAttributes, useState, useCallback, HTMLAttributes, useContext, useEffect, useMemo} from 'react';
import {v4 as uuidv4} from 'uuid';
import {Spin, Tag} from 'antd';
import intl from 'react-intl-universal';
import {Tensor} from 'onnxruntime-web';
import shallow from 'zustand/shallow';
import {relativeMousePosition} from 'common/util';
import {coordinatesCanvasToImage, coordinatesImageToCanvas, limitGrid} from 'common/geometry';
import {drawRect} from 'common/draw';
import {SurroundStyle} from 'common/constant';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';
import {Coordinates} from 'type/annotation';
import {useCanvasContext, useMaskedImageContext, useUpdateMask} from '../common';
import {Rect} from 'common/geometry';
import {NutshClientContext} from 'common/context';
import {useGetOnlineSegmentationEmbedding} from 'state/server/segmentation';
import {SizedContainer} from 'component/SizedContainer';

import {Decoder, downloadTensor, correctSliceUrl} from './common';
import {LocalEmbedding, PredictContainer} from './PredictContainer';
import {ColorPalette} from 'component/panel/entity/display';
import {SegmentationSample} from 'proto/schema/v1/train_pb';
import {emitter} from 'event';
import {useHotkeys} from 'react-hotkeys-hook';

type MaskProps = {
  decoder: Decoder;
};

export const FocusCanvas: FC<HTMLAttributes<HTMLDivElement> & MaskProps> = ({decoder, ...divProps}) => {
  const [rectImage, setRectImage] = useState<Rect | undefined>(undefined);

  return (
    <SizedContainer {...divProps}>
      {([w, h]) =>
        rectImage ? (
          <Workspace width={w} height={h} cropImage={rectImage} decoder={decoder} {...divProps} />
        ) : (
          <SelectCanvas width={w} height={h} onConfirm={setRectImage} style={{cursor: 'crosshair'}} />
        )
      }
    </SizedContainer>
  );
};

const SelectCanvas: FC<CanvasHTMLAttributes<HTMLCanvasElement> & {onConfirm: (rect: Rect) => void}> = ({
  onConfirm,
  ...canvasProps
}) => {
  const {canvas, ctx} = useCanvasContext();

  const setMode = useUIStore(s => s.setMode);
  useHotkeys('esc', () => setMode(undefined));

  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);
  const transform = useRenderStore(s => s.viewport.transform);
  const normalizeCoorImage = useCallback(
    (coorCanvas: Coordinates) => limitGrid(coordinatesCanvasToImage(coorCanvas, transform), imw, imh),
    [imh, imw, transform]
  );

  const [anchors, setAnchors] = useState<[Coordinates | undefined, Coordinates | undefined]>([undefined, undefined]);
  useEffect(() => {
    if (!ctx) return;

    const {width, height} = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    if (anchors[0] && anchors[1]) {
      const [p, q] = anchors;
      const a = coordinatesImageToCanvas(p, transform);
      const b = coordinatesImageToCanvas(q, transform);
      drawRect(ctx, a, b, SurroundStyle);
    }
  }, [anchors, ctx, transform]);

  const [menuPos, setMenuPos] = useState<Coordinates | undefined>(undefined);
  useEffect(() => {
    if (anchors[0] && anchors[1]) {
      const [p, q] = anchors;
      const a = coordinatesImageToCanvas(p, transform);
      const b = coordinatesImageToCanvas(q, transform);
      setMenuPos({x: Math.min(a.x, b.x), y: Math.min(a.y, b.y)});
    } else {
      setMenuPos(undefined);
    }
  }, [anchors, transform]);

  const [drawing, setDrawing] = useState<boolean>(false);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      if (e.button !== 0) return;

      const p = normalizeCoorImage(relativeMousePosition(e, ctx.canvas));
      setAnchors([p, undefined]);
      setDrawing(true);
    },
    [ctx, normalizeCoorImage]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      if (drawing && anchors[0]) {
        const p = normalizeCoorImage(relativeMousePosition(e, ctx.canvas));
        setAnchors([anchors[0], p]);
      }
    },
    [anchors, ctx, drawing, normalizeCoorImage]
  );

  const onMouseUp = useCallback(() => {
    setDrawing(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    setDrawing(false);
  }, []);

  const rect = useMemo(() => {
    if (anchors[0] && anchors[1]) {
      const [p, q] = anchors;
      return {
        x: Math.min(p.x, q.x),
        y: Math.min(p.y, q.y),
        width: Math.abs(p.x - q.x) + 1,
        height: Math.abs(p.y - q.y) + 1,
      };
    }
    return undefined;
  }, [anchors]);

  useHotkeys(
    'enter',
    useCallback(() => rect && onConfirm(rect), [onConfirm, rect])
  );

  return (
    <div style={{width: '100%', height: '100%', position: 'relative'}}>
      <canvas
        {...canvasProps}
        ref={canvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      />
      {menuPos && rect && (
        <div
          style={{
            position: 'absolute',
            left: menuPos.x,
            top: menuPos.y - 32,
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <Tag color="warning" style={{userSelect: 'none', cursor: 'pointer'}} onClick={() => onConfirm(rect)}>
            {rect.width}x{rect.height} {intl.get('press_enter_to_confirm')}
          </Tag>
        </div>
      )}
    </div>
  );
};

const Workspace: FC<HTMLAttributes<HTMLDivElement> & MaskProps & {cropImage: Rect; width: number; height: number}> = ({
  cropImage,
  decoder,
  width,
  height,
  ...divProps
}) => {
  const {canvas, ctx} = useCanvasContext();

  const transform = useRenderStore(s => s.viewport.transform);

  const [p, q] = useMemo(() => {
    const {x, y, width: w, height: h} = cropImage;
    const p = coordinatesImageToCanvas({x, y}, transform);
    const q = coordinatesImageToCanvas({x: x + w, y: y + h}, transform);
    return [p, q];
  }, [cropImage, transform]);

  useEffect(() => {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    ctx.beginPath();
    ctx.fillStyle = '#000000CC';
    ctx.rect(0, 0, q.x, p.y);
    ctx.rect(q.x, 0, width - q.x, q.y);
    ctx.rect(p.x, q.y, width - p.x, height - q.y);
    ctx.rect(0, p.y, p.x, height - p.y);
    ctx.fill();
    ctx.closePath();
  }, [cropImage, ctx, height, p.x, p.y, q.x, q.y, transform, width]);

  const client = useContext(NutshClientContext);
  const sliceUrl = useRenderStore(s => s.sliceUrls[s.sliceIndex]);
  const {isFetching: isEmbedding, data: embedResp} = useGetOnlineSegmentationEmbedding(client, {
    imageUrl: correctSliceUrl(sliceUrl),
    decoderUuid: decoder.uuid,
    crop: cropImage,
  });

  return (
    <div {...divProps}>
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <canvas ref={canvas} width={width} height={height} />
        {isEmbedding && <Spin style={{position: 'absolute', left: (p.x + q.x) / 2 - 10, top: (p.y + q.y) / 2 - 13}} />}
        {embedResp && (
          <WorkspaceLoading
            style={{position: 'absolute', width: '100%', height: '100%', top: 0, left: 0}}
            decoder={decoder}
            embedding={{
              url: embedResp.embedding_url,
              width: cropImage.width,
              height: cropImage.height,
            }}
            maskOffset={[cropImage.x, cropImage.y]}
          />
        )}
      </div>
    </div>
  );
};

type RemoteEmbedding = {
  url: string;
  width: number;
  height: number;
};

const WorkspaceLoading: FC<
  HTMLAttributes<HTMLDivElement> & MaskProps & {embedding: RemoteEmbedding; maskOffset: [number, number]}
> = ({decoder, embedding, maskOffset, ...divProps}) => {
  const [tensor, setTensor] = useState<Tensor | undefined>(undefined);
  useEffect(() => {
    downloadTensor(embedding.url).then(setTensor);
  }, [embedding.url]);

  return tensor ? (
    <WorkspaceLoaded decoder={decoder} embedding={{...embedding, tensor}} maskOffset={maskOffset} {...divProps} />
  ) : (
    <div {...divProps} style={{...divProps.style, cursor: 'wait'}} />
  );
};

const WorkspaceLoaded: FC<
  HTMLAttributes<HTMLDivElement> & MaskProps & {embedding: LocalEmbedding; maskOffset: [number, number]}
> = ({decoder, embedding, maskOffset, ...divProps}) => {
  const maskContext = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = embedding.width;
    canvas.height = embedding.height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }, [embedding.height, embedding.width]);
  useEffect(() => () => maskContext.canvas.remove(), [maskContext.canvas]);

  const transform = useRenderStore(s => s.viewport.transform);

  // color
  const eid = useRenderStore(s => s.select.ids.values().next().value);
  const [newColor, setNewColor] = useState(ColorPalette.current());
  const maskColor = useMemo(() => (eid ? ColorPalette.get(eid) : newColor), [eid, newColor]);

  // confirm
  const {imageContext: maskedImageContext, masks: prevMasks} = useMaskedImageContext();
  const updateMask = useUpdateMask(maskedImageContext, prevMasks);
  const onConfirm = useCallback(() => {
    if (!eid) ColorPalette.advance(uuidv4());
    maskedImageContext.drawImage(maskContext.canvas, maskOffset[0], maskOffset[1], embedding.width, embedding.height);
    updateMask();
    setNewColor(ColorPalette.current());
  }, [eid, embedding.height, embedding.width, maskContext.canvas, maskOffset, maskedImageContext, updateMask]);

  // tune
  const onTune = useCallback(
    (mask: ImageData, sample: SegmentationSample) => {
      emitter.emit('segmentationSampleCreated', sample);
      maskContext.putImageData(mask, 0, 0);
      onConfirm();
    },
    [onConfirm, maskContext]
  );

  // cancel
  const setMode = useUIStore(s => s.setMode);
  const onCancel = useCallback(() => setMode(undefined), [setMode]);

  return (
    <PredictContainer
      maskContext={maskContext}
      decoder={decoder}
      embedding={embedding}
      maskColor={maskColor}
      transform={transform}
      maskOffset={maskOffset}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onTune={onTune}
      {...divProps}
    />
  );
};
