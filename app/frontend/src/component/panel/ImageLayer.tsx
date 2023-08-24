import {FC, useRef, useMemo, HTMLAttributes, useState, useLayoutEffect} from 'react';
import intl from 'react-intl-universal';
import {Alert, Spin} from 'antd';

import {useDownloadImage} from 'state/image/store';

import {rectFitTransform, RectSize} from 'common/geometry';
import {useStore as useRenderStore} from 'state/annotate/render';

const Image: FC<{
  blob: Blob;
  container: {width: number; height: number};
}> = ({blob, container}) => {
  const ref = useRef<HTMLImageElement>(null);
  const src = useMemo(() => URL.createObjectURL(blob), [blob]);

  const {
    scale: r,
    translation: [dx, dy],
  } = useRenderStore(s => s.viewport.transform);
  const setTransform = useRenderStore(s => s.viewport.setTransform);
  const setSliceSize = useRenderStore(s => s.setSliceSize);

  // Using `img` instead of `canvas` to render images and CSS transforms to
  // improve performance.
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#dont_scale_images_in_drawimage
  // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#scaling_canvas_using_css_transforms
  return (
    <img
      id="slice-image"
      ref={ref}
      src={src}
      alt="slice"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformOrigin: '0 0',
        transform: `translate(${dx}px, ${dy}px) scale(${r}, ${r})`,
        userSelect: 'none',
      }}
      onLoad={() => {
        if (!ref.current) return;

        // slice loaded
        const {naturalWidth, naturalHeight} = ref.current;
        const sliceSize = {width: naturalWidth, height: naturalHeight};
        setSliceSize(sliceSize);

        // find the initial transformation to put the image in the center
        const transform = rectFitTransform(sliceSize, container);
        setTransform(transform);
      }}
    />
  );
};

const Loaded: FC<{blob: Blob} & HTMLAttributes<HTMLDivElement>> = ({blob, ...divProps}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState<RectSize | undefined>(undefined);
  useLayoutEffect(() => {
    if (ref.current) {
      const {width, height} = ref.current.getBoundingClientRect();
      setSize({width, height});
    }
  }, []);

  return (
    <div ref={ref} {...divProps}>
      {size && <Image container={{...size}} blob={blob} />}
    </div>
  );
};

const Loading: FC<{url: string} & HTMLAttributes<HTMLDivElement>> = ({url, ...divProps}) => {
  const {isFetching, isError} = useDownloadImage(url);

  return (
    <div {...divProps}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {isError ? (
          <Alert showIcon={true} type="error" message={intl.getHTML('error.failed_to_download_link', {url})} />
        ) : (
          <Spin spinning={isFetching} />
        )}
      </div>
    </div>
  );
};

export const ImageLayer: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  const sliceUrls = useRenderStore(s => s.sliceUrls);
  const sliceIndex = useRenderStore(s => s.sliceIndex);

  const url = sliceUrls[sliceIndex];
  const {data: blob} = useDownloadImage(url);

  return blob ? <Loaded blob={blob} {...divProps} /> : <Loading url={url} {...divProps} />;
};
