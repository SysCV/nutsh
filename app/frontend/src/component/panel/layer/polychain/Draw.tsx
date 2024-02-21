import {FC, useCallback, useState, useEffect, HTMLAttributes, useMemo} from 'react';
import {Button, Space, Tag, Tooltip} from 'antd';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBacon, faRotateLeft, faRotateRight} from '@fortawesome/free-solid-svg-icons';
import {CheckOutlined, ClearOutlined} from '@ant-design/icons';
import intl from 'react-intl-universal';
import shallow from 'zustand/shallow';
import {v4 as uuidv4} from 'uuid';

import {getComponent, useAnnoStore} from 'state/annotate/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useDrawStore, useTemporalStore as useTemporalDrawStore} from 'state/annotate/polychain/draw';

import {detectHover} from 'common/hover';
import {useCanvas, useDrawingEntityId} from 'common/hook';
import {editStyle} from 'common/constant';
import {coordinatesCanvasToImage, limitCoordinates} from 'common/geometry';
import {useDrawPolychain, useDrawVertex, useVisibleEntities} from 'common/render';

import type {ComponentId, Coordinates, EntityId, Vertex} from 'type/annotation';
import {ColorPalette} from 'component/panel/entity/display';
import {useHotkeys} from 'react-hotkeys-hook';
import {useKeyPressed} from 'common/keyboard';
import {useAnnoBroadcastStore} from 'state/annotate/annotation-broadcast';

type Props = HTMLAttributes<HTMLDivElement> & {
  width: number;
  height: number;
};

export const Layer: FC<Props> = ({...baseProps}) => {
  const entityId = useDrawingEntityId();
  return entityId ? <LayerWithEntityId entityId={entityId} {...baseProps} /> : null;
};

const LayerWithEntityId: FC<Props & {entityId: EntityId}> = ({entityId, width, height, ...baseProps}) => {
  console.debug('render polychain DrawLayer');

  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const drawVertices = useDrawStore(s => s.vertices);
  const drawMouse = useDrawStore(s => s.mouse);

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const transform = useRenderStore(s => s.viewport.transform);
  const closed = useUIStore(s => s.mode === 'polygon');

  const [hover, setHover] = useState<
    | {
        entityId: EntityId;
        componentId: ComponentId;
        vertexIdx: number;
      }
    | undefined
  >(undefined);
  const hoveredVertex = useAnnoStore(
    useCallback(
      s => {
        if (!hover) return undefined;
        const {entityId: eid, componentId: cid, vertexIdx: vid} = hover;

        const component = getComponent(s, sliceIndex, eid, cid);
        if (component?.type !== 'polychain') return undefined;

        const vertex = component.vertices[vid];
        return vertex;
      },
      [hover, sliceIndex]
    )
  );

  const segmentClone = useRenderStore(s => s.segmentClone);
  const segmentCloneAnchors = useAnnoStore(
    useCallback(
      s => {
        const {entityId: eid, componentId: cid, vertexIndices} = segmentClone;

        const component = getComponent(s, sliceIndex, eid, cid);
        if (component?.type !== 'polychain') return undefined;

        const vertices = component.vertices;
        if (!vertices) return undefined;

        return vertexIndices.map(i => vertices[i]);
      },
      [sliceIndex, segmentClone]
    )
  );

  const addComponent = useAnnoBroadcastStore('addComponent');

  const drawPolychain = useDrawPolychain(transform);
  const drawAnnoVertex = useDrawVertex(transform);

  const canvas = useCanvas(
    useCallback(
      ctx => {
        const style = editStyle(ColorPalette.get(entityId));
        drawPolychain(ctx, [...drawVertices, {coordinates: drawMouse}], style, closed);
        if (hoveredVertex) {
          drawAnnoVertex(ctx, hoveredVertex, style.vertex);
        }
        segmentCloneAnchors?.forEach(v => {
          drawAnnoVertex(ctx, v, style.vertex);
        });
      },
      [drawVertices, hoveredVertex, segmentCloneAnchors, drawMouse, closed, entityId, drawPolychain, drawAnnoVertex]
    )
  );

  const move = useDrawStore(s => s.move);
  const add = useDrawStore(s => s.add);
  const finish = useDrawStore(s => s.finish);

  const {undo, redo, clear, pastStates, futureStates} = useTemporalDrawStore();

  // actions
  const canConfirm = useMemo(() => {
    const n = drawVertices.length;
    return (closed && n >= 3) || (!closed && n >= 2);
  }, [closed, drawVertices.length]);
  const onConfirm = useCallback(() => {
    if (!canConfirm) {
      return;
    }

    const cid = uuidv4();
    addComponent({
      sliceIndex,
      entityId,
      component: {
        id: cid,
        type: 'polychain',
        vertices: drawVertices,
        closed,
      },
    });

    finish();
    clear();
  }, [canConfirm, addComponent, sliceIndex, entityId, drawVertices, closed, finish, clear]);

  const onCancel = useCallback(() => {
    finish();
    clear();
  }, [clear, finish]);

  const onUndo = useCallback(() => {
    undo();
  }, [undo]);

  const onRedo = useCallback(() => {
    redo();
  }, [redo]);

  // keybaord
  useHotkeys('enter', onConfirm);
  useHotkeys('esc', onCancel);
  useHotkeys('ctrl+z, meta+z', onUndo);
  useHotkeys('ctrl+shift+z, meta+shift+z', onRedo);

  // detect hovering vertex
  const hoverableEntities = useVisibleEntities();
  const [mouseImage, setMouseImage] = useState<Coordinates | undefined>(undefined);
  useEffect(() => {
    if (!mouseImage) return;

    // check segment clone first
    if (segmentClone.vertexIndices.length > 0) {
      // When segment cloning is active, the cloning entity has first priority to detect hovering.
      const e = hoverableEntities[segmentClone.entityId];
      if (e) {
        const hover = detectHover(mouseImage, {[segmentClone.entityId]: e}, sliceIndex, transform);
        if (hover?.vertexIdx !== undefined) {
          setHover({
            entityId: hover.entityId,
            componentId: hover.componentId,
            vertexIdx: hover.vertexIdx,
          });
          return;
        }
      }
    }

    const hover = detectHover(mouseImage, hoverableEntities, sliceIndex, transform);
    if (hover?.vertexIdx !== undefined) {
      setHover({
        entityId: hover.entityId,
        componentId: hover.componentId,
        vertexIdx: hover.vertexIdx,
      });
    } else {
      setHover(undefined);
    }
  }, [
    hoverableEntities,
    mouseImage,
    sliceIndex,
    transform,
    setHover,
    segmentClone.vertexIndices.length,
    segmentClone.entityId,
  ]);

  // segment clone
  const isQPressed = useKeyPressed('q');
  const addSegmentCloneVertex = useRenderStore(s => s.addSegmentCloneVertex);
  const resetSegmentClone = useRenderStore(s => s.resetSegmentClone);
  const segmentCloneVertices = useAnnoStore(
    useCallback(
      s => {
        const {entityId: eid, componentId: cid, vertexIndices} = segmentClone;
        if (vertexIndices.length !== 3) {
          return;
        }

        const component = getComponent(s, sliceIndex, eid, cid);
        if (component?.type !== 'polychain') return undefined;

        const vertices = component.vertices;
        if (!vertices) return undefined;

        const [p, m, q] = segmentClone.vertexIndices;

        const n = vertices.length;
        const right: number[] = [];
        const left: number[] = [];
        for (let i = p; i !== q; i = (i + 1) % n) {
          right.push(i);
        }
        right.push(q);
        for (let i = p; i !== q; i = (i + n - 1) % n) {
          left.push(i);
        }
        left.push(q);

        if (right.includes(m)) {
          return right.map(i => vertices[i]);
        }

        // For inversed clone, bezier vertices need special process.
        const vs: Vertex[] = [];
        for (let i = left.length - 1; i >= 0; i--) {
          const coordinates = vertices[left[i]].coordinates;
          const prevBezier = i > 0 ? vertices[left[i - 1]].bezier : undefined;
          if (prevBezier) {
            // Move the bezier setting to the current vertex and reverse the
            // control point
            vs.push({
              coordinates,
              bezier: {
                control1: prevBezier.control2,
                control2: prevBezier.control1,
              },
            });
          } else {
            // Always ignore current vertex's bezier
            vs.push({coordinates});
          }
        }
        return vs.reverse();
      },
      [sliceIndex, segmentClone]
    )
  );
  useEffect(() => {
    if (!segmentCloneVertices) {
      return;
    }
    add(...segmentCloneVertices);
    resetSegmentClone();
  }, [segmentCloneVertices, add, resetSegmentClone]);
  useEffect(() => {
    if (!isQPressed) {
      resetSegmentClone();
    }
  }, [isQPressed, resetSegmentClone]);

  return (
    <div {...baseProps}>
      <canvas
        ref={canvas}
        width={width}
        height={height}
        onMouseMove={e => {
          if (!canvas.current) return;
          const {left, top} = canvas.current.getBoundingClientRect();
          const q = {x: e.clientX - left, y: e.clientY - top};
          const p = coordinatesCanvasToImage(q, transform);
          if (!isQPressed) {
            move(p);
          }
          setMouseImage(p);
        }}
        onMouseDown={e => {
          if (e.button !== 0) return;

          if (hover && hoveredVertex) {
            if (isQPressed) {
              const {entityId, componentId, vertexIdx} = hover;
              addSegmentCloneVertex(entityId, componentId, vertexIdx);
            } else {
              add({coordinates: hoveredVertex.coordinates});
            }
            return;
          }

          if (!canvas.current) return;
          const {left, top} = canvas.current.getBoundingClientRect();
          const q = {x: e.clientX - left, y: e.clientY - top};
          const p = coordinatesCanvasToImage(q, transform);
          add({coordinates: limitCoordinates(p, imw, imh)});
        }}
      />
      <div style={{position: 'absolute', left: 16, top: 16}}>
        <Space>
          <Tooltip
            title={
              <Space>
                {intl.get('action.undo')}
                <Tag color="warning">⌘/⌃ + Z</Tag>
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={faRotateLeft} width={16} />}
              onClick={onUndo}
              disabled={pastStates.length === 0}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('action.redo')}
                <Tag color="warning">⌘/⌃ + ⇧ + Z</Tag>
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={faRotateRight} width={16} />}
              onClick={onRedo}
              disabled={futureStates.length === 0}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('segment_clone')}
                <Tag color="warning">{intl.get('hold_q')}</Tag>
              </Space>
            }
          >
            <Button
              shape="circle"
              icon={<FontAwesomeIcon icon={faBacon} width={16} />}
              type={isQPressed ? 'primary' : 'default'}
            />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('reset')}
                <Tag color="warning">Esc</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={<ClearOutlined />} onClick={onCancel} />
          </Tooltip>
          <Tooltip
            title={
              <Space>
                {intl.get('confirm')}
                <Tag color="warning">Enter</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={<CheckOutlined />} onClick={onConfirm} disabled={!canConfirm} />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};
