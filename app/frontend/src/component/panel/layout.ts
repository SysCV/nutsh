import {useWindowSize} from '@react-hook/window-size';
import {useStore as useRenderStore} from 'state/annotate/render';
import {UI} from 'common/constant';

export const [leftSidebarWidth, rightSidebarWidth, sliderHeight, statusBarHeight] = [60, 256, 48, 46];
export function useCanvasSize() {
  const [winWidth, winHeight] = useWindowSize();
  const sliceCount = useRenderStore(s => s.sliceUrls.length);
  return [
    winWidth - rightSidebarWidth - leftSidebarWidth,
    winHeight - UI.navbarHeight - (sliceCount > 1 ? sliderHeight : 0) - statusBarHeight,
  ];
}
