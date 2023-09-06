import intl from 'react-intl-universal';
import {MaskComponent} from 'type/annotation';

import {Action} from './common';
import {useContext} from 'react';
import {ConfigContext} from 'common/context';

export function useActions(component: MaskComponent): Action[] {
  const config = useContext(ConfigContext);

  return [
    {
      title: intl.get('menu.auto_track'),
      fn: () => {
        console.log('auto track');
      },
      disableReason: config.track_enabled ? undefined : intl.get('menu.auto_track_disabled'),
    },
  ];
}
