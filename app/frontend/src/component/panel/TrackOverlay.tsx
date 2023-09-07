import {useQuery} from '@tanstack/react-query';
import {v4 as uuidv4} from 'uuid';
import {expand, rleCountsFromStringCOCO, rleCountsToStringCOCO, shrink} from 'common/algorithm/rle';
import {NutshClientContext} from 'common/context';
import {useContext} from 'react';
import {TrackingContext, useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useAnnoStore} from 'state/annotate/annotation';
import {Spin} from 'antd';
import {Component, SliceIndex} from 'type/annotation';

export type Props = React.HTMLAttributes<HTMLDivElement>;

export function TrackOverlay({...props}: Props) {
  const ctx = useUIStore(s => s.tracking);
  const sliceSize = useRenderStore(s => s.sliceSize);
  return ctx && sliceSize ? <ActiveTrackOverlay ctx={ctx} sliceSize={sliceSize} {...props} /> : null;
}

function ActiveTrackOverlay({
  ctx,
  sliceSize,
  ...props
}: {ctx: TrackingContext; sliceSize: {width: number; height: number}} & Props) {
  const client = useContext(NutshClientContext);

  const setTracking = useUIStore(s => s.setTracking);
  const currentSliceIndex = useRenderStore(s => s.sliceIndex);
  const currentSliceUrl = useRenderStore(s => normalizeUrl(s.sliceUrls[s.sliceIndex]));
  const subsequentSliceUrls = useRenderStore(s => s.sliceUrls.slice(s.sliceIndex + 1).map(normalizeUrl));
  const addComponents = useAnnoStore(s => s.addComponents);

  const {isLoading} = useQuery({
    // prevent cache
    queryKey: [uuidv4()],
    retry: false,
    cacheTime: 0,

    queryFn: () => {
      const {rle, offset} = ctx.mask;
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
    onSuccess: ({subsequent_frame_masks: masks}) => {
      const newComponents: {sliceIndex: SliceIndex; component: Component}[] = [];
      masks.forEach(({coco_encoded_rle, width, height}, idx) => {
        const counts = rleCountsFromStringCOCO(coco_encoded_rle);
        const mask = shrink({counts, size: {width, height}});
        if (!mask) {
          return;
        }

        const cid = uuidv4();
        newComponents.push({
          sliceIndex: currentSliceIndex + idx + 1,
          component: {
            id: cid,
            type: 'mask',
            ...mask,
          },
        });
      });

      addComponents({
        entityId: ctx.entityId,
        components: newComponents,
      });

      setTracking(undefined);
    },
    onError: () => {
      setTracking(undefined);
    },
  });

  return (
    <div {...props}>
      <div style={{width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
        <Spin spinning={isLoading} />
      </div>
    </div>
  );
}

function normalizeUrl(str: string): string {
  if (str.startsWith('/')) {
    return `${window.location.protocol}//${window.location.host}${str}`;
  }
  return str;
}
