import {FC, useEffect, useCallback, useState, HTMLAttributes, useRef, CanvasHTMLAttributes, CSSProperties} from 'react';
import {v4 as uuidv4} from 'uuid';
import intl from 'react-intl-universal';
import {message} from 'antd';
import shallow from 'zustand/shallow';
import {Key} from 'ts-key-enum';
import {isHotkeyPressed, useHotkeys} from 'react-hotkeys-hook';

import {useAnnoStore, getComponent} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';

import {useStore as useDrawPolyStore} from 'state/annotate/polychain/draw';
import {useStore as useDrawRectStore} from 'state/annotate/rectangle/draw';

import {Layer as PolyHover} from './polychain/Hover';
import {Layer as RectHover} from './rectangle/Hover';
import {Layer as MaskHover} from './mask/Hover';

import {detectHover} from 'common/hover';
import {useCanvas, useComponent, useSliceSelection} from 'common/hook';
import {coordinatesCanvasToImage, limitCoordinates} from 'common/geometry';
import {useVisibleEntities} from 'common/render';

import type {Component, Coordinates, EntityId} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {ComponentProximity} from 'state/annotate/render/mouse';
import {ColorPalette} from '../entity/display';
import {editStyle} from 'common/constant';
import {useAnnoBroadcastStore} from 'state/annotate/annotation-broadcast';

const FullSize: CSSProperties = {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'};

export const HoverLayer: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  const hover = useRenderStore(s => s.mouse.hover, shallow);

  // detect hover
  const sidx = useRenderStore(s => s.sliceIndex);
  const transform = useRenderStore(s => s.viewport.transform);
  const setHover = useRenderStore(s => s.mouse.setHover);
  const hoverables = useVisibleEntities();
  const [mouse, setMouse] = useState<Coordinates | undefined>(undefined);
  useEffect(() => {
    if (!mouse) return;
    const h = detectHover(mouse, hoverables, sidx, transform);
    setHover(h);
  }, [hoverables, mouse, sidx, transform, setHover]);

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={e => {
        if (!ref.current) return;
        const {left, top} = ref.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);
        setMouse(p);
      }}
      {...divProps}
    >
      {hover ? (
        <ComponentHoverLayer style={FullSize} hover={hover} />
      ) : (
        <FinalHover style={FullSize}>
          <TopLevelHover />
        </FinalHover>
      )}
    </div>
  );
};

const ComponentHoverLayer: FC<HTMLAttributes<HTMLDivElement> & {hover: ComponentProximity}> = ({
  hover,
  ...divProps
}) => {
  const {entityId: eid, componentId: cid} = hover;
  const sidx = useRenderStore(s => s.sliceIndex);
  const component = useComponent(sidx, eid, cid);
  return (
    <div {...divProps}>
      {component && <ComponentHoverLayer_ eid={eid} component={component} hover={hover} style={FullSize} />}
    </div>
  );
};

const ComponentHoverLayer_: FC<
  HTMLAttributes<HTMLDivElement> & {
    eid: EntityId;
    component: Component;
    hover: ComponentProximity;
  }
> = ({eid, component, hover, ...divProps}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<DOMRect | undefined>(undefined);
  useEffect(() => {
    if (!ref.current) return;
    setBox(ref.current.getBoundingClientRect());
  }, []);

  return (
    <div ref={ref} {...divProps}>
      {box && <Canvas eid={eid} component={component} width={box.width} height={box.height} />}
      <FinalHover style={FullSize}>
        <ComponentHover hover={hover} component={component} style={FullSize}>
          <TopLevelHover />
        </ComponentHover>
      </FinalHover>
    </div>
  );
};

const Canvas: FC<CanvasHTMLAttributes<HTMLCanvasElement> & {eid: EntityId; component: Component}> = ({
  eid,
  component,
  ...canvasProps
}) => {
  const transform = useRenderStore(s => s.viewport.transform);
  const canvas = useCanvas(
    useCallback(
      ctx => {
        ctx.imageSmoothingEnabled = false;
        const rgb = ColorPalette.get(eid);
        const adapter = newComponentAdapter(component);
        adapter.render(ctx, transform, editStyle(rgb));
      },
      [eid, component, transform]
    )
  );
  return <canvas ref={canvas} {...canvasProps} />;
};

const ComponentHover: FC<HTMLAttributes<HTMLDivElement> & {component: Component; hover: ComponentProximity}> = ({
  component,
  hover,
  ...divProps
}) => {
  switch (component.type) {
    case 'polychain':
      return <PolyHover component={component} hover={hover} {...divProps} />;
    case 'rectangle':
      return <RectHover component={component} hover={hover} {...divProps} />;
    case 'mask':
      return <MaskHover hover={hover} {...divProps} />;
  }
};

const TopLevelHover: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  const [messageApi, contextHolder] = message.useMessage();

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const hoveringEntityId = useRenderStore(s => s.mouse.hover?.entityId);
  const hoveringComponentId = useRenderStore(s => s.mouse.hover?.componentId);
  const hoveringComponent = useAnnoStore(
    useCallback(
      s => {
        if (!hoveringEntityId || !hoveringComponentId) return undefined;
        return getComponent(s, sliceIndex, hoveringEntityId, hoveringComponentId);
      },
      [sliceIndex, hoveringComponentId, hoveringEntityId]
    )
  );

  const manipulation = useRenderStore(s => s.manipulate.data);
  const stopManipulation = useRenderStore(s => s.manipulate.stop);
  const manipulatingComponent = useAnnoStore(
    useCallback(
      s => {
        if (!manipulation) return undefined;
        const {entityId, sliceIndex, componentId} = manipulation;
        return getComponent(s, sliceIndex, entityId, componentId);
      },
      [manipulation]
    )
  );
  const transferComponent = useAnnoBroadcastStore('transferComponent');
  const addComponents = useAnnoBroadcastStore('addComponents');

  const {isControlOrMetaPressed, isShiftPressed} = useControlMetaShiftPressed();

  const addSelect = useRenderStore(s => s.select.add);
  const toggleSelect = useRenderStore(s => s.select.toggle);

  const [anchor, setAnchor] = useState<Coordinates | undefined>(undefined);
  const transform = useRenderStore(s => s.viewport.transform);
  const startTranslate = useRenderStore(s => s.translate.start);
  const sliceSelection = useSliceSelection();

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      style={FullSize}
      onMouseDown={e => {
        if (e.button !== 0) return;

        if (manipulation?.type === 'transfer') {
          // transfer component
          if (hoveringEntityId !== undefined) {
            const {entityId, componentId, sliceIndex} = manipulation;
            transferComponent({sliceIndex, entityId, componentId, targetEntityId: hoveringEntityId});
            stopManipulation();
          }
          e.stopPropagation();
          return;
        }

        if (manipulation?.type === 'interpolate') {
          // interpolating
          if (manipulatingComponent && hoveringComponent) {
            const adapter = newComponentAdapter(manipulatingComponent);

            // The two components to interpolate must be of the save type and belong to the same entity, while the
            // latter should be gauranteed by UI.
            if (hoveringEntityId === manipulation.entityId) {
              const msidx = manipulation.sliceIndex;
              const n = Math.abs(sliceIndex - msidx);
              if (n <= 1) {
                messageApi.warning(intl.get('menu.warn.can_only_interpolate_across_frames'));
              } else {
                const interpolated = adapter.interpolate(hoveringComponent, n - 1);
                if (interpolated.length === 0) {
                  messageApi.warning(intl.get('menu.warn.can_only_interpolate_beteween_component_with_same_type'));
                } else {
                  const direction = sliceIndex > msidx ? 1 : -1;
                  addComponents({
                    entityId: manipulation.entityId,
                    components: interpolated.map((component, idx) => {
                      const cid = uuidv4();
                      return {
                        sliceIndex: msidx + (idx + 1) * direction,
                        component: {
                          id: cid,
                          ...component,
                        },
                      };
                    }),
                  });
                  stopManipulation();
                }
              }
            }
          }

          e.stopPropagation();
          return;
        }

        if (hoveringEntityId !== undefined) {
          if (isControlOrMetaPressed) {
            if (isShiftPressed) {
              addSelect(hoveringEntityId);
            } else {
              toggleSelect(hoveringEntityId);
            }
            e.stopPropagation();
            return;
          }
        }

        if (ref.current) {
          if (!isControlOrMetaPressed) {
            const {left, top} = ref.current.getBoundingClientRect();
            const q = {x: e.clientX - left, y: e.clientY - top};
            const p = coordinatesCanvasToImage(q, transform);
            setAnchor(p);
          }
        }
      }}
      onMouseMove={e => {
        if (!anchor) return;
        if (hoveringEntityId && hoveringComponentId) {
          startTranslate({
            sliceIndex,
            anchorImage: anchor,
            components: [{entityId: hoveringEntityId, componentId: hoveringComponentId}],
          });
          setAnchor(undefined);
          e.stopPropagation();
          return;
        }
        if (sliceSelection.components.length > 0) {
          startTranslate({...sliceSelection, anchorImage: anchor});
          setAnchor(undefined);
          e.stopPropagation();
          return;
        }
      }}
      onMouseLeave={() => {
        if (anchor) {
          setAnchor(undefined);
        }
      }}
      onMouseUp={e => {
        if (e.button !== 0) return;
        if (anchor) {
          setAnchor(undefined);
        }
      }}
      {...divProps}
    >
      {contextHolder}
    </div>
  );
};

const FinalHover: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  const transform = useRenderStore(s => s.viewport.transform);
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const {isControlOrMetaPressed, isShiftPressed} = useControlMetaShiftPressed();

  const selectCount = useRenderStore(s => s.select.ids.size);
  const clearSelect = useRenderStore(s => s.select.clear);
  const startSurround = useRenderStore(s => s.surround.start);

  const mode = useUIStore(s => s.mode);
  const startDrawPoly = useDrawPolyStore(s => s.start);
  const startDrawRect = useDrawRectStore(s => s.start);

  const hasHover = useRenderStore(s => !!s.mouse.hover);

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseDown={e => {
        if (e.button !== 0) return;
        if (!ref.current) return;

        const {left, top} = ref.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);

        if (isControlOrMetaPressed) {
          startSurround(p);
          return;
        }

        if (selectCount > 1 && !isShiftPressed) {
          clearSelect();
        }

        if (hasHover || isControlOrMetaPressed || isShiftPressed) {
          return;
        }

        switch (mode) {
          case 'polygon':
          case 'polyline':
            startDrawPoly(limitCoordinates(p, imw, imh));
            break;
          case 'rectangle':
            startDrawRect(limitCoordinates(p, imw, imh));
            break;
        }
      }}
      {...divProps}
    />
  );
};

function useControlMetaShiftPressed() {
  const [isControlOrMetaPressed, setControlOrMetaPressed] = useState(
    isHotkeyPressed(Key.Control) || isHotkeyPressed(Key.Meta)
  );
  const [isShiftPressed, setShiftPressed] = useState(isHotkeyPressed(Key.Shift));
  useHotkeys(
    [Key.Control, Key.Meta, Key.Shift],
    e => {
      setControlOrMetaPressed(e.ctrlKey || e.metaKey);
      setShiftPressed(e.shiftKey);
    },
    {
      keydown: true,
      keyup: true,
    }
  );

  return {isControlOrMetaPressed, isShiftPressed};
}
