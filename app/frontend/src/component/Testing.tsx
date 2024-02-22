import {useEffect} from 'react';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useAnnoStoreRaw} from 'state/annotate/annotation-provider';

export function Testing(): JSX.Element {
  const annoStore = useAnnoStoreRaw();

  useEffect(() => {
    const annoState = annoStore.getState();
    const renderState = useRenderStore.getState();
    window.testing = {annoState, renderState};
  }, [annoStore]);

  useEffect(
    () =>
      annoStore.subscribe(annoState => {
        window.testing = {...window.testing, annoState};
      }),
    [annoStore]
  );
  useEffect(
    () =>
      useRenderStore.subscribe(renderState => {
        window.testing = {...window.testing, renderState};
      }),
    []
  );
  return <></>;
}
