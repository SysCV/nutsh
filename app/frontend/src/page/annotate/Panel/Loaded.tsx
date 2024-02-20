import {FC, useEffect} from 'react';

import {useWindowSize} from '@react-hook/window-size';
import shallow from 'zustand/shallow';
import {useStore as useRenderStore} from 'state/annotate/render';
import {prefetchImages} from 'state/image/store';
import {UI} from 'common/constant';
import type {Project, Video} from 'openapi/nutsh';
import type {ProjectSpec} from 'type/project_spec';
import {FrameSlider} from 'component/panel/FrameSlider';
import {StatusBar} from 'component/panel/StatusBar';
import {leftSidebarWidth, statusBarHeight, sliderHeight, rightSidebarWidth} from 'component/panel/layout';
import {ActionBar} from 'component/panel/ActionBar';
import {EntityBar} from 'component/panel/EntityBar';
import {Canvas} from './Canvas';

export const PanelLoaded: FC<{
  video: Video;
  project: Project;
  projectSpec: ProjectSpec;
}> = ({video, project, projectSpec}) => {
  // Special attention must be paid to prevent unnecessary rerendeing of the
  // Panel, since it has a list of `EntityCard` to render, which may count as
  // hundreds or thousands.
  console.debug('render PanelLoaded');

  const sliceCount = useRenderStore(s => s.sliceUrls.length);

  // prefetch all images
  const urls = useRenderStore(s => s.sliceUrls, shallow);
  useEffect(() => {
    console.debug(`prefetch ${urls.length} images`);
    prefetchImages(urls);
  }, [urls]);

  // local
  const [winWidth, winHeight] = useWindowSize();

  return (
    <div
      style={{
        background: 'black',
        width: winWidth,
        height: winHeight - UI.navbarHeight,
        position: 'relative',
      }}
    >
      <div style={{display: 'flex', flexDirection: 'row', height: '100%'}}>
        <ActionBar
          style={{width: leftSidebarWidth, height: '100%', background: UI.darkBackground, overflowY: 'auto'}}
        />
        <div style={{flexGrow: 1, height: '100%', position: 'relative'}}>
          <StatusBar project={project} video={video} style={{height: statusBarHeight}} />
          <Canvas />
          {sliceCount > 1 && (
            <div style={{height: sliderHeight, margin: `0 ${UI.spacing}px`, display: 'flex', alignItems: 'center'}}>
              <FrameSlider style={{width: '100%'}} />
            </div>
          )}
        </div>
        <EntityBar
          projectSpec={projectSpec}
          style={{
            width: rightSidebarWidth,
            height: '100%',
            padding: UI.spacing,
            background: UI.darkBackground,
            position: 'relative',
          }}
        />
      </div>
    </div>
  );
};
