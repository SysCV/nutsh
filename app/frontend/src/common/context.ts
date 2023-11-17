import {createContext} from 'react';
import {Config, NutshClient} from 'openapi/nutsh';

export const NutshClientContext = createContext(new NutshClient({}));
export const ConfigContext = createContext<Config>({
  readonly: true,
  online_segmentation_enabled: false,
  track_enabled: false,
});
