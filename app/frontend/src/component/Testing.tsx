import {FC, useEffect} from 'react';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useAnnoStore} from 'state/annotate/annotation';
export const Testing: FC = () => {
  useEffect(() => {
    const annoState = useAnnoStore.getState();
    const renderState = useRenderStore.getState();
    window.testing = {annoState, renderState};
  }, []);

  useEffect(
    () =>
      useAnnoStore.subscribe(annoState => {
        window.testing = {...window.testing, annoState};
      }),
    []
  );
  useEffect(
    () =>
      useRenderStore.subscribe(renderState => {
        window.testing = {...window.testing, renderState};
      }),
    []
  );

  return <></>;
};
