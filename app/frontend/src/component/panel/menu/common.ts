import {useCallback, useMemo} from 'react';
import {App} from 'antd';
import intl from 'react-intl-universal';
import {v4 as uuidv4} from 'uuid';

import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useStore as useRenderStore} from 'state/annotate/render';

import type {EntityId, ComponentId} from 'type/annotation';
import {getSlice} from 'state/annotate/annotation';
import {
  useDeleteComponents,
  useDeleteEntities,
  usePaste,
  useSeparateComponent,
  useTruncateEntities,
} from 'state/annotate/annotation-broadcast';

export type Action = {
  title: string;

  fn?: () => void;
  hotkey?: string;
  warning?: string;
  disableReason?: string;

  children?: Action[];
};

export function useComponentActions(entityId: EntityId, componentId: ComponentId): Action[] {
  const sliceIndex = useRenderStore(s => s.sliceIndex);

  const {separateComponent} = useSeparateComponent();
  const {deleteComponents} = useDeleteComponents();
  const startManipulation = useRenderStore(s => s.manipulate.start);

  const nc = useAnnoStore(
    useCallback(
      s => {
        const slice = getSlice(s, sliceIndex, entityId) ?? {};
        return Object.keys(slice).length;
      },
      [entityId, sliceIndex]
    )
  );

  const actions: Action[] = [
    {
      title: intl.get('menu.interpolate'),
      fn: () => startManipulation({type: 'interpolate', entityId, sliceIndex, componentId}),
    },
    {
      title: intl.get('menu.form_new_entity'),
      disableReason: nc >= 2 ? undefined : intl.get('menu.warn.it_is_the_only_component_of_its_entity'),
      fn: () => {
        const eid = uuidv4();
        const cid = uuidv4();
        separateComponent({sliceIndex, entityId, componentId, newEntityId: eid, newComponentId: cid});
      },
    },
    {
      title: intl.get('menu.transfer_component'),
      fn: () => startManipulation({type: 'transfer', entityId, sliceIndex, componentId}),
    },
    {
      title: intl.get('menu.delete_hovering_component'),
      fn: () => deleteComponents({sliceIndex, components: [[entityId, componentId]]}),
      warning: intl.get('menu.warn.delete_hovering_component'),
    },
  ];

  return actions;
}

export function useEntityActions(): Action[] {
  const {message} = App.useApp();

  const entities = useAnnoStore(s => s.annotation.entities);
  const selectIds = useRenderStore(s => s.select.ids);
  const sliceIndex = useRenderStore(s => s.sliceIndex);

  const {deleteEntities} = useDeleteEntities();
  const {deleteComponents} = useDeleteComponents();
  const {truncateEntities} = useTruncateEntities();

  // copy
  const copy = useRenderStore(s => s.copy);
  const clipboard = useRenderStore(s => s.copying);
  const components = useMemo(() => {
    const selections: [EntityId, ComponentId][] = [];
    selectIds.forEach(eid => {
      const entity = entities[eid];
      if (!entity) return;
      const components = entity.geometry.slices[sliceIndex] ?? {};
      Object.keys(components).forEach(cid => selections.push([eid, cid]));
    });
    return selections;
  }, [entities, sliceIndex, selectIds]);

  // paste
  const {paste} = usePaste();
  const actions: Action[] = [
    {
      title: intl.get('paste'),
      hotkey: '⌘/⌃ + V',
      disableReason: clipboard ? undefined : intl.get('menu.warn.clipboard_is_empty'),
      fn: () => {
        if (!clipboard) {
          return;
        }
        const cs = clipboard.ecids.map(ec => ({...ec, newComponentId: uuidv4()}));
        paste({
          entityComponents: cs,
          sourceSliceIndex: clipboard.sliceIndex,
          targetSliceIndex: sliceIndex,
        });
      },
    },
  ];

  const ec = selectIds.size;
  if (ec > 0) {
    const entityIds = Array.from(selectIds.values());

    actions.push({
      title: intl.get('menu.selected_entities_title', {count: ec}),
      children: [
        {
          title: intl.get('menu.copy_selected_entities'),
          hotkey: '⌘/⌃ + C',
          fn: () => {
            copy(components.map(([eid, cid]) => ({entityId: eid, componentId: cid})));
            message.success(intl.get('copied'));
          },
        },
        {
          title: intl.get('menu.delete_selected_components_in_current_frame'),
          fn: () => {
            deleteComponents({sliceIndex, components});
          },
          warning: intl.get('menu.warn.delete_selected_components_in_current_frame', {count: ec}),
        },
        {
          title: intl.get('menu.truncate_selected_entities'),
          fn: () => {
            truncateEntities({entityIds, sinceSliceIndex: sliceIndex});
          },
          warning: intl.get('menu.warn.truncate_selected_entities', {count: ec}),
        },
        {
          title: intl.get('menu.delete_selected_entities'),
          fn: () => {
            deleteEntities({entityIds});
          },
          warning: intl.get('menu.warn.delete_selected_entities', {count: ec}),
        },
      ],
    });
  }

  return actions;
}
