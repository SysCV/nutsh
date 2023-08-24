import {FC, CanvasHTMLAttributes, useContext, CSSProperties, useState, useEffect} from 'react';
import {Spin, Typography, Result} from 'antd';
import intl from 'react-intl-universal';
import {InferenceSession} from 'onnxruntime-web';

import {NutshClientContext} from 'common/context';
import {OnlineSegmentationDecoder} from 'openapi/nutsh';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useGetOnlineSegmentation} from 'state/server/segmentation';

import {FocusCanvas} from './FocusCanvas';
import {WholeCanvas} from './WholeCanvas';

type CanvasProps = CanvasHTMLAttributes<HTMLCanvasElement>;

const {Title} = Typography;

const MaskStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  background: 'rgba(0,0,0,0.8)',
};

export const Layer: FC<CanvasProps> = ({style, ...canvasProps}) => {
  const client = useContext(NutshClientContext);
  const {isFetching, data} = useGetOnlineSegmentation(client);

  if (!data?.decoder) {
    return (
      <div style={style}>
        <div style={MaskStyle}>
          {isFetching ? (
            <>
              <Spin spinning={true} />
              <Title level={3}>{intl.get('online_segmentation.fetching_decoder')}</Title>
            </>
          ) : (
            <Result status="error" title={intl.get(data ? 'online_segmentation.missing_decoder' : 'error.unknown')} />
          )}
        </div>
      </div>
    );
  }
  return <CanvasWithDecoderUrl decoder={data.decoder} style={style} {...canvasProps} />;
};

const CanvasWithDecoderUrl: FC<CanvasProps & {decoder: OnlineSegmentationDecoder}> = ({decoder, style}) => {
  const [session, setSession] = useState<InferenceSession | undefined>(undefined);
  useEffect(() => {
    InferenceSession.create(decoder.url).then(setSession);
  }, [decoder.url]);

  const isWhole = useUIStore(s => s.mode === 'wand');
  return session ? (
    isWhole ? (
      <WholeCanvas decoder={{...decoder, session}} style={style} />
    ) : (
      <FocusCanvas decoder={{...decoder, session}} style={style} />
    )
  ) : (
    <div style={{...style, cursor: 'wait'}} />
  );
};
