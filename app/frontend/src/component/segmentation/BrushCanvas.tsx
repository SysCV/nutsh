import {FC, useEffect, useState, CanvasHTMLAttributes, useCallback, useMemo, useRef, HTMLAttributes} from 'react';
import create from 'zustand';
import {immer} from 'zustand/middleware/immer';
import intl from 'react-intl-universal';
import {coordinatesCanvasToImage, coordinatesImageToCanvas, distance} from 'common/geometry';
import {FocusOpacity} from 'common/constant';
import {convertRGBA2Hex} from 'common/color';
import {Coordinates} from 'type/annotation';
import {relativeMousePosition} from 'common/util';
import {updateImageRendering, useCanvasContext} from '../panel/layer/mask/common';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {Alert, Button, Popover, Slider, Space, Tag, Tooltip, Typography, theme} from 'antd';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {CheckOutlined, ClearOutlined, CloseOutlined, ExpandAltOutlined, InfoCircleFilled} from '@ant-design/icons';
import {faBrush, faCircle, faClone, faEraser, faSquare} from '@fortawesome/free-solid-svg-icons';
import {useHotkeys} from 'react-hotkeys-hook';
import {useStore as useRenderStore} from 'state/annotate/render';

const {Text} = Typography;

// The brush size is in image frame and represents the size of the surrounding square.
const [MinBrushSize, MaxBrushSize] = [1, 64];

type CanvasProps = CanvasHTMLAttributes<HTMLCanvasElement>;

type Props = {
  imageContext: CanvasRenderingContext2D;
  brushColor: [number, number, number];
  transform: ViewportTransform;
  imageOffset?: [number, number];
  onCancel: () => void;
  onConfirm: () => void;
};

type State = {
  mouseImage: Coordinates | undefined;
  setMouseImage: (mouseImage: Coordinates | undefined) => void;

  sizeImage: number;
  setSize: (size: number) => void;
  updateSize: (delta: number) => void;

  isSquare: boolean;
  setSquare: (isSquare: boolean) => void;
  toggleSquare: () => void;

  isErasing: boolean;
  setErasing: (isErasing: boolean) => void;
  toggleErasing: () => void;

  isOverwriting: boolean;
  setOverwriting: (isOverwriting: boolean) => void;
  toggleOverwriting: () => void;

  isModified: boolean;
  setModified: (isModified: boolean) => void;
};

export const useStore = create<State>()(
  immer<State>(set => ({
    mouseImage: undefined,
    setMouseImage: (mouseImage: Coordinates | undefined) => {
      set(s => {
        s.mouseImage = mouseImage;
      });
    },

    sizeImage: 32,
    setSize: (size: number) => {
      set(s => {
        s.sizeImage = size;
      });
    },
    updateSize: (delta: number) => {
      set(s => {
        const r = s.sizeImage + delta;
        s.sizeImage = Math.min(Math.max(r, MinBrushSize), MaxBrushSize);
      });
    },

    isSquare: true,
    setSquare: (isSquare: boolean) => {
      set(s => {
        s.isSquare = isSquare;
      });
    },
    toggleSquare: () => {
      set(s => {
        s.isSquare = !s.isSquare;
      });
    },

    isErasing: false,
    setErasing: (isErasing: boolean) => {
      set(s => {
        s.isErasing = isErasing;
      });
    },
    toggleErasing: () => {
      set(s => {
        s.isErasing = !s.isErasing;
      });
    },

    isOverwriting: false,
    setOverwriting: (isOverwriting: boolean) => {
      set(s => {
        s.isOverwriting = isOverwriting;
      });
    },
    toggleOverwriting: () => {
      set(s => {
        s.isOverwriting = !s.isOverwriting;
      });
    },

    isModified: false,
    setModified: (isModified: boolean) => {
      set(s => {
        s.isModified = isModified;
      });
    },
  }))
);

export const BrushCanvas: FC<CanvasProps & Props> = ({
  imageContext,
  brushColor,
  transform,
  imageOffset,
  onCancel: cancel,
  onConfirm: confirm,
  style,
  ...canvasProps
}) => {
  console.debug('render BrushCanvas');

  const setModified = useStore(s => s.setModified);
  useEffect(() => {
    return () => {
      setModified(false);
    };
  }, [setModified]);

  const onConfirm = useCallback(() => {
    confirm();
    setModified(false);
  }, [confirm, setModified]);

  const onCancel = useCallback(() => {
    cancel();
    setModified(false);
  }, [cancel, setModified]);

  // brush
  const isSquare = useStore(s => s.isSquare);
  const isErasing = useStore(s => s.isErasing);
  const isOverwriting = useStore(s => s.isOverwriting);
  const updateSize = useStore(s => s.updateSize);
  const toggleErasing = useStore(s => s.toggleErasing);
  const toggleOverwriting = useStore(s => s.toggleOverwriting);
  const toggleSquare = useStore(s => s.toggleSquare);

  // configure context
  useEffect(() => {
    const o = isErasing ? 'destination-out' : isOverwriting ? 'source-over' : 'destination-over';
    imageContext.globalCompositeOperation = o;
    imageContext.imageSmoothingEnabled = false;
  }, [imageContext, isErasing, isOverwriting]);

  // shortcuts
  useHotkeys(
    '=',
    useCallback(() => updateSize(1), [updateSize])
  );
  useHotkeys(
    '-',
    useCallback(() => updateSize(-1), [updateSize])
  );
  useHotkeys(
    'e',
    useCallback(() => toggleErasing(), [toggleErasing])
  );
  useHotkeys(
    'c',
    useCallback(() => toggleSquare(), [toggleSquare])
  );
  useHotkeys(
    'o',
    useCallback(() => toggleOverwriting(), [toggleOverwriting])
  );

  useHotkeys('enter', onConfirm);
  useHotkeys('esc', onCancel);

  // mouse
  const container = useRef<HTMLDivElement | null>(null);
  const setMouseImage = useStore(s => s.setMouseImage);
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!container.current) return;
      const p = relativeMousePosition(e, container.current);
      const q = coordinatesCanvasToImage(p, transform);
      setMouseImage(q);
    },
    [setMouseImage, transform]
  );

  return (
    <div style={style}>
      <div style={{width: '100%', height: '100%', position: 'relative'}} ref={container} onMouseMove={onMouseMove}>
        {isSquare ? (
          <CanvasSquare
            imageContext={imageContext}
            strokeColor={brushColor}
            transform={transform}
            imageOffset={imageOffset}
            {...canvasProps}
          />
        ) : (
          <CanvasCircle
            imageContext={imageContext}
            strokeColor={brushColor}
            transform={transform}
            imageOffset={imageOffset}
            {...canvasProps}
          />
        )}
        <CanvasMouse
          strokeColor={brushColor}
          transform={transform}
          style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}
          {...canvasProps}
        />
        <Toolbar style={{position: 'absolute', left: 16, top: 16}} onCancel={onCancel} onConfirm={onConfirm} />
      </div>
    </div>
  );
};

const Toolbar: FC<HTMLAttributes<HTMLDivElement> & {onCancel: () => void; onConfirm: () => void}> = ({
  onCancel,
  onConfirm,
  ...divProps
}) => {
  const size = useStore(s => s.sizeImage);
  const isErasing = useStore(s => s.isErasing);
  const isOverwriting = useStore(s => s.isOverwriting);
  const isSquare = useStore(s => s.isSquare);
  const isModified = useStore(s => s.isModified);
  const setSize = useStore(s => s.setSize);
  const toggleErasing = useStore(s => s.toggleErasing);
  const toggleOverwriting = useStore(s => s.toggleOverwriting);
  const toggleSquare = useStore(s => s.toggleSquare);

  const isTuning = useRenderStore(s => s.isTuning);

  return (
    <div {...divProps}>
      <Space direction="vertical">
        <Space>
          <Tooltip
            title={
              <Space direction="vertical">
                <Space>
                  {intl.get('overwrite')}
                  <Tag color="warning">O</Tag>
                </Space>
                {isTuning && <Text type="secondary">{intl.get('overwrite_tuning_hint')}</Text>}
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={faClone} width={16} />}
              onClick={() => toggleOverwriting()}
              type={isOverwriting ? 'primary' : 'default'}
              disabled={isTuning}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('square/circle')}
                <Tag color="warning">C</Tag>
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={isSquare ? faSquare : faCircle} width={16} />}
              onClick={() => toggleSquare()}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('brush/eraser')}
                <Tag color="warning">E</Tag>
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={isErasing ? faEraser : faBrush} width={16} />}
              onClick={() => toggleErasing()}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('size')}
                <Tag color="warning">+ / -</Tag>
              </Space>
            }
          >
            <div>
              <Popover
                trigger={['click']}
                placement="bottom"
                content={
                  <Slider min={MinBrushSize} max={MaxBrushSize} value={size} onChange={setSize} style={{width: 120}} />
                }
              >
                <Button shape="circle" icon={<ExpandAltOutlined />} />
              </Popover>
            </div>
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get(isModified ? 'reset' : 'cancel')}
                <Tag color="warning">Esc</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={isModified ? <ClearOutlined /> : <CloseOutlined />} onClick={onCancel} />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('confirm')}
                <Tag color="warning">Enter</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={<CheckOutlined />} onClick={onConfirm} disabled={!isModified} />
          </Tooltip>
        </Space>
        {isModified && <Alert message={intl.get('mask_unsaved_message')} type="warning" showIcon={true} />}
      </Space>
    </div>
  );
};

type BrushProps = {
  strokeColor: [number, number, number];
  transform: ViewportTransform;
};

type DrawProps = BrushProps & {
  imageContext: CanvasRenderingContext2D;
  imageOffset?: [number, number];
};

const CanvasMouse: FC<CanvasProps & BrushProps> = ({strokeColor, transform, ...canvasProps}) => {
  const ims = useStore(s => s.sizeImage);
  const isErasing = useStore(s => s.isErasing);
  const isSquare = useStore(s => s.isSquare);

  const {canvas, ctx} = useCanvasContext(initContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.strokeStyle = isErasing ? 'white' : convertRGBA2Hex(...strokeColor, 255);
    ctx.stroke();
  }, [ctx, strokeColor, isErasing]);

  const mouseImage = useStore(s => s.mouseImage);
  useEffect(() => {
    if (!ctx) return;

    const q = mouseImage;
    if (!q) return;

    const {width, height} = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    if (isSquare) {
      const [x, y, w, h] = normalizeRectDraw(q.x - ims / 2, q.y - ims / 2, ims, ims);
      const a = coordinatesImageToCanvas({x, y}, transform);
      const b = coordinatesImageToCanvas({x: x + w, y: y + h}, transform);

      ctx.beginPath();
      ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.stroke();
    } else {
      const r = (ims / 2) * transform.scale;
      const p = coordinatesImageToCanvas(q, transform);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }, [ctx, ims, isSquare, mouseImage, transform]);

  const isModified = useStore(s => s.isModified);
  const mouseCanvas = useMemo(() => {
    const q = mouseImage;
    if (!q) return;
    return coordinatesImageToCanvas(q, transform);
  }, [mouseImage, transform]);
  const {token} = theme.useToken();

  return (
    <>
      <canvas ref={canvas} {...canvasProps} />
      {mouseCanvas && isModified && (
        <InfoCircleFilled
          style={{
            position: 'absolute',
            left: mouseCanvas.x,
            top: mouseCanvas.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            color: token.colorPrimary,
          }}
        />
      )}
    </>
  );
};

const CanvasCircle: FC<CanvasProps & DrawProps> = ({
  imageContext: ctxIm,
  strokeColor,
  transform,
  imageOffset = [0, 0],
  style,
  ...canvasProps
}) => {
  const ims = useStore(s => s.sizeImage);
  const setModified = useStore(s => s.setModified);

  const {canvas, ctx} = useCanvasContext(initContext);
  useEffect(() => {
    ctxIm.fillStyle = convertRGBA2Hex(...strokeColor, 255);
  }, [ctxIm, strokeColor]);

  const [imdx, imdy] = useMemo(() => imageOffset, [imageOffset]);

  // reset upon transforming
  useEffect(() => {
    ctxIm.lineJoin = 'round';
    ctxIm.lineCap = 'round';
    ctxIm.lineWidth = ims;
    ctxIm.strokeStyle = convertRGBA2Hex(...strokeColor, 255);
  }, [ctxIm, strokeColor, ims]);

  useEffect(() => {
    if (!ctx) return;
    updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);
  }, [ctx, ctxIm, imdx, imdy, transform]);

  // update rendering when `isModified` is changed to false (from outside).
  const isModified = useStore(s => s.isModified);
  useEffect(() => {
    if (!ctx) return;
    if (!isModified) {
      updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);
    }
  }, [ctx, ctxIm, imdx, imdy, isModified, transform]);

  const [drawing, setDrawing] = useState(false);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      if (e.button !== 0) return;

      const p = relativeMousePosition(e, ctx.canvas);
      const q = coordinatesCanvasToImage(p, transform);

      // initial draw
      ctxIm.beginPath();
      ctxIm.arc(q.x - imdx, q.y - imdy, ims / 2, 0, 2 * Math.PI);
      ctxIm.fill();
      updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);

      // move
      ctxIm.beginPath();
      ctxIm.moveTo(q.x - imdx, q.y - imdy);

      setDrawing(true);

      // mark modified
      setModified(true);
    },
    [ctx, transform, ctxIm, ims, imdx, imdy, setModified]
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      const p = relativeMousePosition(e, ctx.canvas);

      if (drawing) {
        const q = coordinatesCanvasToImage(p, transform);

        // draw
        ctxIm.lineTo(q.x - imdx, q.y - imdy);
        ctxIm.stroke();

        // re-draw the the visible canvas
        updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);
      }
    },
    [ctx, drawing, transform, ctxIm, imdx, imdy]
  );
  const onMouseUp = useCallback(() => {
    ctxIm.closePath();
    setDrawing(false);
  }, [ctxIm]);

  return (
    <canvas
      ref={canvas}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{...style, opacity: FocusOpacity}}
      {...canvasProps}
    />
  );
};

const CanvasSquare: FC<CanvasProps & DrawProps> = ({
  imageContext: ctxIm,
  strokeColor,
  transform,
  imageOffset = [0, 0],
  style,
  ...canvasProps
}) => {
  const ims = useStore(s => s.sizeImage);
  const setModified = useStore(s => s.setModified);

  const {canvas, ctx} = useCanvasContext(initContext);
  useEffect(() => {
    ctxIm.fillStyle = convertRGBA2Hex(...strokeColor, 255);
  }, [ctxIm, strokeColor]);

  const [imdx, imdy] = useMemo(() => imageOffset, [imageOffset]);

  // reset upon transforming
  useEffect(() => {
    if (!ctx) return;
    updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);
  }, [ctx, ctxIm, transform, imdx, imdy]);

  // update rendering when `isModified` is changed to false (from outside).
  const isModified = useStore(s => s.isModified);
  useEffect(() => {
    if (!ctx) return;
    if (!isModified) {
      updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);
    }
  }, [ctx, ctxIm, imdx, imdy, isModified, transform]);

  const [lastPos, setLastPos] = useState<Coordinates | undefined>(undefined);
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      if (e.button !== 0) return;

      const p = relativeMousePosition(e, ctx.canvas);
      const q = coordinatesCanvasToImage(p, transform);

      // initial draw
      ctxIm.beginPath();
      ctxIm.rect(...normalizeRectDraw(q.x - ims / 2 - imdx, q.y - ims / 2 - imdy, ims, ims));
      ctxIm.fill();
      updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);

      setLastPos(q);

      // mark modified
      setModified(true);
    },
    [ctx, transform, ctxIm, ims, imdx, imdy, setModified]
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      const p = relativeMousePosition(e, ctx.canvas);
      const q = coordinatesCanvasToImage(p, transform);

      if (lastPos) {
        // draw squares from the last position to the current position
        const d = distance(lastPos, q);
        const a = Math.atan2(q.y - lastPos.y, q.x - lastPos.x);

        for (let i = 0; i < d; i++) {
          const x = lastPos.x + i * Math.cos(a);
          const y = lastPos.y + i * Math.sin(a);
          ctxIm.beginPath();
          ctxIm.rect(...normalizeRectDraw(x - ims / 2 - imdx, y - ims / 2 - imdy, ims, ims));
          ctxIm.fill();
        }

        // re-draw the the visible canvas
        updateImageRendering(ctx, ctxIm, transform, [imdx, imdy]);

        // update last position
        setLastPos(q);
      }
    },
    [ctx, transform, lastPos, ctxIm, ims, imdx, imdy]
  );
  const onMouseUp = useCallback(() => setLastPos(undefined), []);

  return (
    <canvas
      style={{...style, opacity: FocusOpacity}}
      ref={canvas}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      {...canvasProps}
    />
  );
};

function normalizeRectDraw(x: number, y: number, w: number, h: number): [number, number, number, number] {
  return [Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)];
}

function initContext(ctx: CanvasRenderingContext2D): void {
  ctx.imageSmoothingEnabled = false;
}
