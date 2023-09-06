import {useQuery} from '@tanstack/react-query';
import {expand, rleCountsToStringCOCO} from 'common/algorithm/rle';
import {NutshClientContext} from 'common/context';
import {useContext} from 'react';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';
import {MaskComponent} from 'type/annotation';
import {Spin} from 'antd';

export type Props = React.HTMLAttributes<HTMLDivElement>;

export function TrackOverlay({...props}: Props) {
  const mask = useUIStore(s => s.trackingMask);
  const sliceSize = useRenderStore(s => s.sliceSize);
  return mask && sliceSize ? <ActiveTrackOverlay mask={mask} sliceSize={sliceSize} {...props} /> : null;
}

function ActiveTrackOverlay({
  mask,
  sliceSize,
  ...props
}: {mask: MaskComponent; sliceSize: {width: number; height: number}} & Props) {
  const client = useContext(NutshClientContext);

  const currentSliceUrl = useRenderStore(s => normalizeUrl(s.sliceUrls[s.sliceIndex]));
  const subsequentSliceUrls = useRenderStore(s => s.sliceUrls.slice(s.sliceIndex + 1).map(normalizeUrl));

  const {isLoading} = useQuery({
    queryFn: () => {
      const {rle, offset} = mask;
      const {
        counts,
        size: {width, height},
      } = expand(rle, sliceSize, offset);
      const cocoStr = rleCountsToStringCOCO(counts);
      return client.default.track({
        requestBody: {
          first_frame_mask: {coco_encoded_rle: cocoStr, width, height},
          first_frame_url: currentSliceUrl,
          subsequent_frame_urls: subsequentSliceUrls,
        },
      });
    },
    onSuccess: resp => {
      console.log(resp);
    },
  });

  return (
    <div {...props}>
      <Spin spinning={isLoading} />
    </div>
  );
}

function normalizeUrl(str: string): string {
  if (str.startsWith('')) {
    return `${window.location.protocol}//${window.location.host}${str}`;
  }
  return str;
}
