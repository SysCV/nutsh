import {FC, useContext, useState, useEffect, useMemo, useCallback, HTMLAttributes} from 'react';
import {Spin, Typography, Result} from 'antd';
import {v4 as uuidv4} from 'uuid';
import shallow from 'zustand/shallow';
import intl from 'react-intl-universal';
import {InferenceSession, Tensor} from 'onnxruntime-web';

import {NutshClientContext} from 'common/context';
import {OnlineSegmentationDecoder} from 'openapi/nutsh';
import {ColorPalette} from 'component/panel/entity/display';
import {useGetOnlineSegmentationEmbedding} from 'state/server/segmentation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';

import {useImageContext, useMaskedImageContext, useUpdateMask} from '../common';
import {Decoder, downloadTensor} from './common';
import {PredictContainer} from './PredictContainer';
import {SegmentationSample} from 'proto/schema/v1/train_pb';
import {emitter} from 'event';

const {Text, Title} = Typography;

type DivProps = HTMLAttributes<HTMLDivElement>;

export const WholeCanvas: FC<DivProps & {decoder: Decoder}> = ({decoder, ...divProps}) => {
  const client = useContext(NutshClientContext);
  const sliceUrl = useRenderStore(s => s.sliceUrls[s.sliceIndex]);
  const {isFetching, data} = useGetOnlineSegmentationEmbedding(client, {
    imageUrl: sliceUrl,
    decoderUuid: decoder.uuid,
  });
  if (!data) {
    return (
      <div {...divProps}>
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.8)',
          }}
        >
          {isFetching ? (
            <>
              <Spin spinning={true} />
              <Title level={3}>{intl.get('online_segmentation.embedding_title')}</Title>
              <Text type="secondary">{intl.get('online_segmentation.embedding_remark')}</Text>
            </>
          ) : (
            <Result
              status="error"
              title={intl.get('online_segmentation.embed_failed')}
              subTitle={intl.get('online_segmentation.embed_failed_remark')}
            />
          )}
        </div>
      </div>
    );
  }
  return <CanvasWithEmbedding decoder={decoder} embeddingUrl={data.embedding_url} {...divProps} />;
};

const CanvasWithEmbedding: FC<DivProps & {decoder: OnlineSegmentationDecoder; embeddingUrl: string}> = ({
  decoder: decoderInfo,
  embeddingUrl,
  ...divProps
}) => {
  const [embedding, setEmbedding] = useState<Tensor | undefined>(undefined);
  useEffect(() => {
    downloadTensor(embeddingUrl).then(setEmbedding);
  }, [embeddingUrl]);

  const [decoder, setDecoder] = useState<InferenceSession | undefined>(undefined);
  useEffect(() => {
    InferenceSession.create(decoderInfo.url).then(setDecoder);
  }, [decoderInfo.url]);

  return embedding && decoder ? (
    <CanvasLoaded decoder={{...decoderInfo, session: decoder}} embedding={embedding} {...divProps} />
  ) : (
    <div {...divProps} style={{...divProps.style, cursor: 'wait'}} />
  );
};

const CanvasLoaded: FC<DivProps & {decoder: Decoder; embedding: Tensor}> = ({decoder, embedding, ...divProps}) => {
  const maskContext = useImageContext();

  // color
  const eid = useRenderStore(s => s.select.ids.values().next().value);
  const [newColor, setNewColor] = useState(ColorPalette.current());
  const maskColor = useMemo(() => (eid ? ColorPalette.get(eid) : newColor), [eid, newColor]);

  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);
  const transform = useRenderStore(s => s.viewport.transform);

  // confirm
  const {imageContext: maskedImageContext, masks: prevMasks} = useMaskedImageContext();
  const updateMask = useUpdateMask(maskedImageContext, prevMasks);
  const onConfirm = useCallback(() => {
    if (!eid) ColorPalette.advance(uuidv4());
    maskedImageContext.drawImage(maskContext.canvas, 0, 0, imw, imh);
    updateMask();
    setNewColor(ColorPalette.current());
  }, [imh, imw, maskContext.canvas, maskedImageContext, eid, updateMask]);

  // tune
  const onTune = useCallback(
    (mask: ImageData, sample: SegmentationSample) => {
      emitter.emit('segmentationSampleCreated', sample);
      maskContext.putImageData(mask, 0, 0);
      onConfirm();
    },
    [maskContext, onConfirm]
  );

  // cancel
  const setMode = useUIStore(s => s.setMode);
  const onCancel = useCallback(() => setMode(undefined), [setMode]);

  return (
    <PredictContainer
      maskContext={maskContext}
      decoder={decoder}
      embedding={{tensor: embedding, width: imw, height: imh}}
      maskColor={maskColor}
      transform={transform}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onTune={onTune}
      {...divProps}
    />
  );
};
