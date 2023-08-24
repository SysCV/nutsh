import {FC, useState, HTMLAttributes, useEffect, useRef} from 'react';

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'>;
export const SizedContainer: FC<DivProps & {children: (size: [number, number]) => React.ReactElement}> = ({
  children,
  ...divProps
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number] | undefined>(undefined);
  useEffect(() => {
    if (!container.current) return;
    const {width, height} = container.current.getBoundingClientRect();
    setSize([width, height]);
  }, []);

  useEffect(() => {
    if (!container.current) return;
    const e = container.current;

    const resizeObserver = new ResizeObserver(entries => {
      const {width, height} = entries[0].contentRect;
      setSize([width, height]);
    });

    resizeObserver.observe(e);
    return () => {
      resizeObserver.unobserve(e);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={container} {...divProps}>
      {size && children(size)}
    </div>
  );
};
