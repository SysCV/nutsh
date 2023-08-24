// Use relative import instead of "absolute" import based on `src` will enable
// importing by e2e package to autocomplete.
import type {State as AnnoState} from './state/annotate/annotation';
import type {State as RenderState} from './state/annotate/render';

type Testing = {
  annoState: AnnoState;
  renderState: RenderState;
};

declare global {
  interface Window {
    testing: Testing;
  }
}
