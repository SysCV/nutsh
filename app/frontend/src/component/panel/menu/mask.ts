import intl from 'react-intl-universal';
import {v4 as uuidv4} from 'uuid';
import {Component, EntityId, MaskComponent, SliceIndex} from 'type/annotation';
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
  const addComponents = useAnnoStore(s => s.addComponents);
  const commitDraftComponents = useAnnoStore(s => s.commitDraftComponents);

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
              commitDraftComponents(); // this will save the result to the storage
              return;
            }

            // one or more results might be concatecated together
            const resultJsonStrs = splitJSONs(new TextDecoder().decode(value));
            const newComponents: {sliceIndex: SliceIndex; component: Component}[] = [];
            for (const str of resultJsonStrs) {
              let resultJson: {frame_index: number; mask: Mask};
              try {
                resultJson = JSON.parse(str);
              } catch (e) {
                console.error(`failed to parse mask json: ${str}`, e);
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
              newComponents.push({
                sliceIndex: currentSliceIndex + fidx /* fidx starts at 1*/,
                component: {
                  id: cid,
                  type: 'mask',
                  draft: true, // mark these new components as draft and sync when the streaming is finished
                  ...mask,
                },
              });
            }
            addComponents({
              entityId: eid,
              components: newComponents,
            });
          }
        })
        .catch(error => {
          console.error('fetch error:', error);
        });
    },
    [addComponents, commitDraftComponents, currentSliceIndex, currentSliceUrl, eid, sliceSize, subsequentSliceUrls]
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

function splitJSONs(str: string): string[] {
  const results = [];
  let openBraces = 0;
  let lastCut = 0;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === '{') openBraces++;
    if (str[i] === '}') openBraces--;

    if (openBraces === 0 && str[i] === '}') {
      const jsonString = str.slice(lastCut, i + 1);
      results.push(jsonString.trim());
      lastCut = i + 1;
    }
  }
  const rest = str.slice(lastCut).trim();
  if (rest) {
    results.push(rest);
  }
  return results;
}
