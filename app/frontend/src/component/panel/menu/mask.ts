import intl from 'react-intl-universal';
import {v4 as uuidv4} from 'uuid';
import {Component, EntityId, MaskComponent, SliceIndex} from 'type/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';
import {Action} from './common';
import {useCallback, useContext} from 'react';
import {ConfigContext} from 'common/context';
import {expand, rleCountsFromStringCOCO, rleCountsToStringCOCO, shrink} from 'common/algorithm/rle';
import {Mask, TrackReq} from 'openapi/nutsh';
import {correctSliceUrl} from 'common/route';
import {useAddDeleteComponents} from 'state/annotate/annotation-broadcast';

export function useActions(mask: MaskComponent, eid: EntityId): Action[] {
  const config = useContext(ConfigContext);

  const isLastSlice = useRenderStore(s => s.sliceIndex + 1 === s.sliceUrls.length);
  const setTracking = useUIStore(s => s.setTracking);
  const deleteTracking = useUIStore(s => s.deleteTracking);

  const sliceSize = useRenderStore(s => s.sliceSize);
  const currentSliceIndex = useRenderStore(s => s.sliceIndex);
  const currentSliceUrl = useRenderStore(s => correctSliceUrl(s.sliceUrls[s.sliceIndex]));
  const subsequentSliceUrls = useRenderStore(s => s.sliceUrls.slice(s.sliceIndex + 1).map(correctSliceUrl));
  const {addComponents} = useAddDeleteComponents();

  const track = useCallback(
    (mask: MaskComponent) => {
      if (!sliceSize) {
        return;
      }
      setTracking(eid, 0);

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
              // A global `<CommitDraft />` component will monitor all ongoing drafting and will commit them once there
              // are no more active trackings.
              return;
            }

            const total = req.subsequent_frame_urls.length;
            let maxFrameIndex = 0;

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

              if (fidx > maxFrameIndex) {
                // made progress
                maxFrameIndex = fidx;
                setTracking(eid, maxFrameIndex / total);
              }

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
        })
        .finally(() => {
          deleteTracking(eid);
        });
    },
    [
      addComponents,
      currentSliceIndex,
      currentSliceUrl,
      deleteTracking,
      eid,
      setTracking,
      sliceSize,
      subsequentSliceUrls,
    ]
  );

  // TODO(hxu): For now we use only the focused mask, which might be just one component of the whole entity which may
  // have more than one component on the current frame. Let's keep that in mind.
  return [
    {
      title: intl.get('menu.auto_track'),
      fn: () => track(mask),
      disableReason: isLastSlice
        ? intl.get('menu.auto_track_unapplicable_last_slice')
        : !config.track_enabled
        ? intl.get('menu.auto_track_disabled')
        : undefined,
    },
  ];
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
