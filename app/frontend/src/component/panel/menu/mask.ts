import intl from 'react-intl-universal';
import {MaskComponent} from 'type/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';

import {Action} from './common';
import {useContext} from 'react';
import {ConfigContext} from 'common/context';

export function useActions(component: MaskComponent): Action[] {
  const config = useContext(ConfigContext);

  const isLastSlice = useRenderStore(s => s.sliceIndex + 1 === s.sliceUrls.length);
  const setTrackingMask = useUIStore(s => s.setTrackingMask);

  return [
    {
      title: intl.get('menu.auto_track'),
      fn: () => setTrackingMask(component),
      disableReason: isLastSlice
        ? intl.get('auto_track_unapplicable_last_slice')
        : !config.track_enabled
        ? intl.get('menu.auto_track_disabled')
        : undefined,
    },
  ];
}
