import intl from 'react-intl-universal';
import {v4 as uuidv4} from 'uuid';
import {EntityId, MaskComponent} from 'type/annotation';
import {TrackingContext} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useAnnoStore} from 'state/annotate/annotation';
import {Action} from './common';
import {useCallback, useContext} from 'react';
import {ConfigContext} from 'common/context';
import {expand, rleCountsFromStringCOCO, rleCountsToStringCOCO, shrink} from 'common/algorithm/rle';
import {Mask, TrackReq} from 'openapi/nutsh';

export function useActions(mask: MaskComponent, eid: EntityId): Action[] {
  const config = useContext(ConfigContext);

  const isLastSlice = useRenderStore(s => s.sliceIndex + 1 === s.sliceUrls.length);
  // const setTracking = useUIStore(s => s.setTracking);

  const sliceSize = useRenderStore(s => s.sliceSize);
  const currentSliceIndex = useRenderStore(s => s.sliceIndex);
  const currentSliceUrl = useRenderStore(s => normalizeUrl(s.sliceUrls[s.sliceIndex]));
  const subsequentSliceUrls = useRenderStore(s => s.sliceUrls.slice(s.sliceIndex + 1).map(normalizeUrl));
  const addComponent = useAnnoStore(s => s.addComponent);

  const track = useCallback(
    ({mask}: TrackingContext) => {
      if (!sliceSize) {
        return;
      }

      const {rle, offset} = mask;
      const {
        counts,
        size: {width, height},
      } = expand(rle, sliceSize, offset);
      const cocoStr = rleCountsToStringCOCO(counts);
      const req: TrackReq = {
        first_frame_mask: {coco_encoded_rle: cocoStr, width, height},
        first_frame_url: currentSliceUrl,
        subsequent_frame_urls: subsequentSliceUrls,
      };

      fetch('/api/stream/track', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(req),
      })
        .then(async response => {
          if (!response.body) {
            throw new Error('missing response body');
          }
          const reader = response.body.getReader();

          let done, value;
          while (!done) {
            ({value, done} = await reader.read());
            if (done) {
              console.log('stream finished');
              return;
            }

            const resultJsonStr = new TextDecoder().decode(value);
            let resultJson: {frame_index: number; mask: Mask};
            try {
              resultJson = JSON.parse(resultJsonStr);
            } catch (e) {
              console.error('failed to parse mask json', e);
              continue;
            }

            const {
              frame_index: fidx,
              mask: {coco_encoded_rle, width, height},
            } = resultJson;

            const counts = rleCountsFromStringCOCO(coco_encoded_rle);
            const mask = shrink({counts, size: {width, height}});
            if (!mask) {
              continue;
            }

            const cid = uuidv4();
            addComponent({
              sliceIndex: currentSliceIndex + fidx /* fidx starts at 1*/,
              entityId: eid,
              component: {
                id: cid,
                type: 'mask',
                ...mask,
              },
            });
          }
        })
        .catch(error => {
          console.error('fetch error:', error);
        });
    },
    [addComponent, currentSliceIndex, currentSliceUrl, eid, sliceSize, subsequentSliceUrls]
  );

  return [
    {
      title: intl.get('menu.auto_track'),
      fn: () => track({mask, entityId: eid}),
      disableReason: isLastSlice
        ? intl.get('menu.auto_track_unapplicable_last_slice')
        : !config.track_enabled
        ? intl.get('menu.auto_track_disabled')
        : undefined,
    },
  ];
}

// TODO(hxu): this will be deprecated after rebasing master.
function normalizeUrl(str: string): string {
  if (str.startsWith('/')) {
    return `${window.location.protocol}//${window.location.host}${str}`;
  }
  return str;
}
