import {FC, useState, useEffect, useMemo, useCallback, HTMLAttributes} from 'react';
import intl from 'react-intl-universal';
import {Button, Space, Tag, Tooltip} from 'antd';
import {faXmark} from '@fortawesome/free-solid-svg-icons';
import {throttle} from 'lodash';
import {Tensor} from 'onnxruntime-web';

import {FocusOpacity} from 'common/constant';
import {relativeMousePosition} from 'common/util';
import {coordinatesCanvasToImage, coordinatesImageToCanvas, distance} from 'common/geometry';
import {SizedContainer} from 'component/SizedContainer';
import {Coordinates} from 'type/annotation';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {useStore as useRenderStore} from 'state/annotate/render';

import {updateImageRendering, useCanvasContext} from '../common';
import {Decoder} from './common';
import {Click, useOutputToMask, usePredict} from './predict';
import {ClearOutlined, CloseOutlined, EditOutlined} from '@ant-design/icons';
import {BrushCanvas, useStore as useBrushStore} from 'component/segmentation/BrushCanvas';
import {rleCountsToStringCOCO} from 'common/algorithm/rle';
import {encodeRLE} from 'common/algorithm/rle';

import {SegmentationSample} from 'proto/schema/v1/train_pb';
import {useHotkeys} from 'react-hotkeys-hook';

const CLICK_CIRCLE_RADIUS_CANVAS = 5;

export type LocalEmbedding = {
  tensor: Tensor;
  width: number;
  height: number;
};

type Props = {
  maskContext: CanvasRenderingContext2D;
  decoder: Decoder;
  embedding: LocalEmbedding;
  maskColor: [number, number, number];
  transform: ViewportTransform;
  maskOffset?: [number, number];
  onConfirm: () => void;
  onCancel: () => void;
  onTune?: (imageData: ImageData, sample: SegmentationSample) => void;
};

export const PredictContainer: FC<HTMLAttributes<HTMLDivElement> & Props> = ({
  maskContext,
  maskColor,
  transform,
  decoder,
  embedding,
  maskOffset,
  onConfirm,
  onCancel,
  onTune,
  ...divProps
}) => {
  console.debug('render PredictContainer');

  return (
    <SizedContainer {...divProps}>
      {([w, h]) => (
        <PredictBody
          width={w}
          height={h}
          style={{width: '100%', height: '100%'}}
          maskContext={maskContext}
          maskColor={maskColor}
          transform={transform}
          decoder={decoder}
          embedding={embedding}
          maskOffset={maskOffset}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onTune={onTune}
        />
      )}
    </SizedContainer>
  );
};

const PredictBody: FC<HTMLAttributes<HTMLDivElement> & Props & {width: number; height: number}> = ({
  maskContext,
  maskColor,
  transform,
  decoder,
  embedding,
  maskOffset = [0, 0],
  width,
  height,
  onConfirm,
  onCancel,
  onTune,
  ...divProps
}) => {
  console.debug('render PredictBody');

  const [mdx, mdy] = useMemo(() => maskOffset, [maskOffset]);
  const maskCoors = useCallback(
    (p: Coordinates) => {
      const {x, y} = p;
      return {x: x - mdx, y: y - mdy};
    },
    [mdx, mdy]
  );

  const {canvas, ctx} = useCanvasContext();
  useEffect(() => {
    if (!ctx) return;
    updateImageRendering(ctx, maskContext, transform, [mdx, mdy]);
  }, [mdx, mdy, ctx, maskContext, transform]);

  const outputToMask = useOutputToMask(maskColor);

  const isWithinMask = useCallback(
    (p: Coordinates) => {
      const {x, y} = maskCoors(p);
      if (x < 0 || x > embedding.width || y < 0 || y > embedding.height) return false;
      return true;
    },
    [embedding.height, embedding.width, maskCoors]
  );

  const {canvas: clickCanvas, ctx: clickContext} = useCanvasContext();
  const [clicks, setClicks] = useState<Click[]>([]);
  const nearbyClick = useCallback(
    (q: Coordinates) => {
      let [idx, dist] = [-1, Number.MAX_VALUE];
      clicks.forEach((c, i) => {
        const d = distance(c, q);
        if (d < dist) {
          dist = d;
          idx = i;
        }
      });
      return dist < CLICK_CIRCLE_RADIUS_CANVAS / transform.scale ? idx : undefined;
    },
    [clicks, transform.scale]
  );

  // start a new session when color changes
  useEffect(() => setClicks([]), [maskColor]);

  const predict = usePredict(decoder.session, decoder.feed_js, embedding.tensor, [embedding.width, embedding.height]);

  // render clicks upon changes
  useEffect(() => {
    if (!clickContext) return;
    const {width, height} = clickContext.canvas;
    clickContext.clearRect(0, 0, width, height);
    clicks.forEach(({x, y, isPositive}) => {
      const p = coordinatesImageToCanvas({x, y}, transform);

      clickContext.beginPath();
      clickContext.arc(p.x, p.y, CLICK_CIRCLE_RADIUS_CANVAS, 0, 2 * Math.PI);
      clickContext.fillStyle = isPositive ? 'green' : 'red';
      clickContext.fill();
    });
  }, [clickContext, clicks, transform]);

  // calculate mask upon click changes
  const [mask, setMask] = useState<ImageData | undefined>(undefined);
  useEffect(() => {
    if (clicks.length > 0) {
      const cs = clicks.map(click => ({...click, ...maskCoors(click)}));
      predict(cs).then(output => {
        const mask = outputToMask(output);
        setMask(mask);
      });
    } else {
      setMask(undefined);
    }
  }, [clicks, maskCoors, outputToMask, predict]);
  useEffect(() => {
    if (!ctx) return;
    if (mask) {
      maskContext.putImageData(mask, 0, 0);
      updateImageRendering(ctx, maskContext, transform, [mdx, mdy]);
    } else {
      const {width, height} = maskContext.canvas;
      maskContext.clearRect(0, 0, width, height);
      updateImageRendering(ctx, maskContext, transform, [mdx, mdy]);
    }
  }, [mdx, mdy, ctx, mask, maskContext, transform]);

  const onlinePredict = useMemo(
    () =>
      throttle(
        (q: Coordinates) => {
          if (!ctx || clicks.length > 0) return;
          predict([{...maskCoors(q), isPositive: true}]).then(output => {
            const mask = outputToMask(output);
            maskContext.putImageData(mask, 0, 0);
            updateImageRendering(ctx, maskContext, transform, [mdx, mdy]);
          });
        },
        // The throttling interval should be slightly larger than the typical inference time.
        // On my M2 Macbook 2022 it costs ~80ms for a 1280x720 image.
        // TODO(hxu): do not hard-code this number.
        100
      ),
    [mdx, mdy, clicks.length, ctx, maskContext, maskCoors, outputToMask, predict, transform]
  );

  const [cursor, setCursor] = useState('copy');
  const deleteCursor = useMemo(() => {
    const r = 8;
    const [w, h, , , p] = faXmark.icon;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${2 * r}" height="${2 * r}" viewBox="0 0 ${2 * r} ${2 * r}">
        <defs>
          <symbol viewBox="0 0 ${w} ${h}" id="icon"><path d="${p}"/></symbol>
        </defs>
        <use href="#icon" fill="black" width="${2 * r}" height="${2 * r}" x="0" y="0" />
      </svg>`;
    const encoded = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encoded}") ${r} ${r}, auto`;
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      const p = relativeMousePosition(e, ctx.canvas);
      const q = coordinatesCanvasToImage(p, transform);
      if (!isWithinMask(q)) {
        setCursor('not-allowed');
        return;
      }

      onlinePredict(q);

      // update cursor
      const idx = nearbyClick(q);
      setCursor(idx === undefined ? 'copy' : deleteCursor);
    },
    [ctx, deleteCursor, isWithinMask, nearbyClick, onlinePredict, transform]
  );

  // click
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!ctx) return;
      if (e.button !== 0) return;

      const p = relativeMousePosition(e, ctx.canvas);
      const q = coordinatesCanvasToImage(p, transform);

      if (!isWithinMask(q)) return;
      const q_ = maskCoors(q);

      // check if it is near some existing click
      const idx = nearbyClick(q);
      if (idx !== undefined) {
        // remove this click
        clicks.splice(idx, 1);
        setClicks([...clicks]);
        setCursor('copy');
      } else {
        // check the mask value at the click position
        const pixel = maskContext.getImageData(q_.x, q_.y, 1, 1).data;
        const isPositive = clicks.length === 0 || pixel[3] === 0;
        setClicks([...clicks, {...q, isPositive}]);
      }
    },
    [clicks, ctx, isWithinMask, maskContext, maskCoors, nearbyClick, transform]
  );

  // tune
  const isTuning = useRenderStore(s => s.isTuning);
  const setTuning = useRenderStore(s => s.setTuning);
  const canTune = useMemo(() => clicks.length > 0, [clicks.length]);
  const [mw, mh] = [maskContext.canvas.width, maskContext.canvas.height];

  const tuneContext = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = mw;
    canvas.height = mh;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return ctx;
  }, [mh, mw]);

  const startTune = useCallback(() => {
    // The `tuneContext` maybe modified inside the `BrushCanvas`. Therefore, we reset before each tuning.
    tuneContext.reset();
    tuneContext.clearRect(0, 0, mw, mh);
    tuneContext.drawImage(maskContext.canvas, 0, 0);
    setTuning(true);
  }, [maskContext.canvas, mh, mw, setTuning, tuneContext]);

  const confirmTune = useCallback(() => {
    const imageData = tuneContext.getImageData(0, 0, mw, mh);

    // make sample
    const mask = new Uint8Array(mw * mh);
    for (let i = 0, ridx = 0; i < imageData.data.length; i += 4, ridx++) {
      const a = imageData.data[i + 3];

      // turn row-major to column-major
      const [y, x] = [Math.floor(ridx / mw), ridx % mw];
      const cidx = x * mh + y;
      mask[cidx] = a > 0 ? 1 : 0;
    }
    const rleCounts = encodeRLE(mask);
    const rleCocoStr = rleCountsToStringCOCO(rleCounts);

    const pointPrompts = clicks.map(click => ({...click, ...maskCoors(click)}));
    const sample = new SegmentationSample({
      input: mdx > 0 || mdy > 0 ? {crop: {x: mdx, y: mdy, width: mw, height: mh}} : undefined,
      prompt: {pointPrompts},
      output: {mask: {cocoEncodedRle: rleCocoStr, size: {width: mw, height: mh}}},
    });

    setTuning(false);
    onTune?.(imageData, sample);
  }, [clicks, maskCoors, mdx, mdy, mh, mw, onTune, setTuning, tuneContext]);

  const isModified = useBrushStore(s => s.isModified);
  const setModified = useBrushStore(s => s.setModified);
  const cancelTune = useCallback(() => {
    if (isModified) {
      // Must set `globalCompositeOperation` to the drawing mode, i.e. 'destination-over', before resetting.
      const oldGlobalCompositeOperation = tuneContext.globalCompositeOperation;
      tuneContext.globalCompositeOperation = 'destination-over';

      // reset if there are modifications
      const {width: w, height: h} = tuneContext.canvas;
      tuneContext.clearRect(0, 0, w, h);
      tuneContext.drawImage(maskContext.canvas, 0, 0);
      setModified(false);

      // Set back the original globalCompositeOperation.
      tuneContext.globalCompositeOperation = oldGlobalCompositeOperation;
    } else {
      setTuning(false);
    }
  }, [isModified, maskContext.canvas, setModified, setTuning, tuneContext]);
  const clearPrompts = useCallback(() => setClicks([]), []);

  // keyboard
  useHotkeys('r', clearPrompts);
  useHotkeys(
    't',
    useCallback(() => canTune && startTune(), [canTune, startTune])
  );
  useHotkeys('enter', onConfirm, {enabled: !isTuning});
  useHotkeys('esc', onCancel, {enabled: !isTuning});

  return (
    <div {...divProps}>
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <canvas
          ref={canvas}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          style={{opacity: FocusOpacity, cursor}}
          width={width}
          height={height}
          hidden={isTuning}
        />
        {isTuning && tuneContext && (
          <BrushCanvas
            style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', cursor: 'none'}}
            imageContext={tuneContext}
            brushColor={maskColor}
            width={width}
            height={height}
            transform={transform}
            imageOffset={maskOffset}
            onConfirm={confirmTune}
            onCancel={cancelTune}
          />
        )}
        <canvas
          style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}
          ref={clickCanvas}
          width={width}
          height={height}
        />
      </div>
      {!!onTune && !isTuning && (
        <div style={{position: 'absolute', left: 16, top: 16}}>
          <Space>
            <Tooltip
              title={
                <Space>
                  {intl.get('tune')}
                  <Tag color="warning">T</Tag>
                </Space>
              }
            >
              <Button shape="circle" icon={<EditOutlined />} onClick={startTune} disabled={!canTune} />
            </Tooltip>
            <Tooltip
              title={
                <Space>
                  {intl.get('clear_prompts')}
                  <Tag color="warning">R</Tag>
                </Space>
              }
            >
              <Button shape="circle" icon={<ClearOutlined />} onClick={clearPrompts} disabled={clicks.length === 0} />
            </Tooltip>
            <Tooltip
              title={
                <Space>
                  {intl.get('cancel')}
                  <Tag color="warning">Esc</Tag>
                </Space>
              }
            >
              <Button shape="circle" icon={<CloseOutlined />} onClick={onCancel} />
            </Tooltip>
          </Space>
        </div>
      )}
    </div>
  );
};
