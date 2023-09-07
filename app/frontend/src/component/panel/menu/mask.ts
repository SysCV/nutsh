import intl from 'react-intl-universal';
import {EntityId, MaskComponent} from 'type/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';

import {Action} from './common';
import {useContext} from 'react';
import {ConfigContext} from 'common/context';

export function useActions(mask: MaskComponent, eid: EntityId): Action[] {
  const config = useContext(ConfigContext);

  const isLastSlice = useRenderStore(s => s.sliceIndex + 1 === s.sliceUrls.length);
  const setTracking = useUIStore(s => s.setTracking);

  return [
    {
      title: intl.get('menu.auto_track'),
      fn: () => setTracking({mask, entityId: eid}),
      disableReason: isLastSlice
        ? intl.get('menu.auto_track_unapplicable_last_slice')
        : !config.track_enabled
        ? intl.get('menu.auto_track_disabled')
        : undefined,
    },
  ];
}
