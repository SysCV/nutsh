import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

import type {EntityId, ComponentId, SliceIndex, Annotation} from 'type/annotation';

import {createSelectSlice, SelectSlice} from './select';
import {createSurroundSlice, SurroundSlice} from './surround';
import {createViewportSlice, ViewportSlice} from './viewport';
import {createMouseSlice, MouseSlice} from './mouse';
import {createTranslateSlice, TranslateSlice} from './translate';
import {createManipulateSlice, ManipulateSlice} from './manipulate';

export type EntityComponentId = {
  entityId: EntityId;
  componentId: ComponentId;
};

export interface EntityFilter {
  category: string;
  entry: string;
}

export interface State {
  sliceUrls: string[];
  annotationVersion: string;
  startAnnotation: (sliceUrls: string[], version: string) => void;
  setAnnotationVersion: (annotationVersion: string) => void;

  forgetEntities: (...entityIds: EntityId[]) => void;

  sliceIndex: SliceIndex;
  setSliceIndex: (sliceIndex: SliceIndex) => void;
  offsetSliceIndex: (delta: number) => void;

  sliceSize: {width: number; height: number} | undefined;
  setSliceSize: (sliceSize: {width: number; height: number}) => void;

  editingEntityId: EntityId | undefined;
  setEditingEntityId: (editingEntityId: EntityId | undefined) => void;
  focusEntity: (entityId: EntityId) => void;

  hideUnselected: boolean;
  toggleHideUnselected: () => void;

  isSyncing: boolean;
  setIsSyncing: (isSyncing: boolean) => void;
  syncError: string | undefined;
  setSyncError: (syncError: string | undefined) => void;

  segmentClone: EntityComponentId & {
    vertexIndices: number[];
  };
  addSegmentCloneVertex: (entityId: EntityId, componentId: ComponentId, vertexIndex: number) => void;
  resetSegmentClone: () => void;

  copying: {ecids: EntityComponentId[]; sliceIndex: SliceIndex} | undefined;
  copy: (ecids: EntityComponentId[]) => void;

  showSummary: boolean;
  setShowSummary: (showSummary: boolean) => void;

  isTuning: boolean;
  setTuning: (isTuning: boolean) => void;

  select: SelectSlice;
  surround: SurroundSlice;
  viewport: ViewportSlice;
  mouse: MouseSlice;
  translate: TranslateSlice;
  manipulate: ManipulateSlice;
}

export const emptyAnnotation = (): Annotation => ({entities: {}});

export const useStore = create<State>()(
  immer<State>((set, ...a) => ({
    select: createSelectSlice(set, ...a),
    surround: createSurroundSlice(set, ...a),
    viewport: createViewportSlice(set, ...a),
    mouse: createMouseSlice(set, ...a),
    translate: createTranslateSlice(set, ...a),
    manipulate: createManipulateSlice(set, ...a),

    annotation: emptyAnnotation(),
    annotationVersion: '',
    hideUnselected: false,
    editingEntityId: undefined,

    sliceUrls: [],
    sliceIndex: 0,
    sliceSize: undefined,

    syncError: undefined,
    isSyncing: false,

    segmentClone: {
      entityId: '',
      componentId: '',
      vertexIndices: [],
    },
    transferingComponent: undefined,
    copying: undefined,

    startAnnotation: (sliceUrls: string[], version: string) => {
      set(s => {
        s.sliceUrls = sliceUrls;
        s.annotationVersion = version;
      });
    },
    setAnnotationVersion: (annotationVersion: string) => {
      set(s => {
        s.annotationVersion = annotationVersion;
      });
    },
    setSliceIndex: (sliceIndex: SliceIndex) => {
      set(s => {
        if (sliceIndex < 0) return;
        if (sliceIndex >= s.sliceUrls.length) return;
        if (s.sliceIndex === sliceIndex) return;
        setSliceIndex(s, sliceIndex);
        s.sliceSize = undefined;
      });
    },
    offsetSliceIndex: (delta: number) => {
      set(s => {
        const idx = s.sliceIndex + delta;
        if (idx < 0) return;
        if (idx >= s.sliceUrls.length) return;
        if (s.sliceIndex === idx) return;
        setSliceIndex(s, idx);
        s.sliceSize = undefined;
      });
    },
    setSliceSize: (sliceSize: {width: number; height: number}) => {
      set(s => {
        s.sliceSize = sliceSize;
      });
    },
    forgetEntities: (...entityIds: EntityId[]) => {
      set(s => {
        entityIds.forEach(eid => {
          if (s.mouse.hover?.entityId === eid) {
            s.mouse.hover = undefined;
          }
          if (s.editingEntityId === eid) {
            s.editingEntityId = undefined;
          }
          s.select.ids.delete(eid);
        });
      });
    },
    setEditingEntityId: (editingEntityId: EntityId | undefined) => {
      set(s => {
        s.editingEntityId = editingEntityId;
      });
    },
    toggleHideUnselected: () => {
      set(s => {
        s.hideUnselected = !s.hideUnselected;
      });
    },
    focusEntity: (entityId: EntityId) => {
      set(s => {
        s.select.ids = new Set([entityId]);
      });
    },
    setSyncError: (syncError: string | undefined) => {
      set(s => {
        s.syncError = syncError;
      });
    },
    setIsSyncing: (isSyncing: boolean) => {
      set(s => {
        s.isSyncing = isSyncing;
      });
    },
    addSegmentCloneVertex: (entityId: EntityId, componentId: ComponentId, vertexIndex: number) => {
      set(s => {
        const {entityId: oe, componentId: oc, vertexIndices: ov} = s.segmentClone;
        if (oe === entityId && oc === componentId) {
          if (!ov.includes(vertexIndex)) {
            s.segmentClone.vertexIndices.push(vertexIndex);
          }
        } else {
          s.segmentClone.entityId = entityId;
          s.segmentClone.componentId = componentId;
          s.segmentClone.vertexIndices = [vertexIndex];
        }
      });
    },
    resetSegmentClone: () => {
      set(s => {
        s.segmentClone.entityId = '';
        s.segmentClone.componentId = '';
        s.segmentClone.vertexIndices = [];
      });
    },
    copy: (ecids: EntityComponentId[]) => {
      set(s => {
        const sliceIndex = s.sliceIndex;
        s.copying = ecids.length > 0 ? {ecids, sliceIndex} : undefined;
      });
    },

    showSummary: true,
    setShowSummary: (showSummary: boolean) => {
      set(s => {
        s.showSummary = showSummary;
      });
    },

    isTuning: false,
    setTuning: (isTuning: boolean) => {
      set(s => {
        s.isTuning = isTuning;
      });
    },
  }))
);

function setSliceIndex(s: State, sliceIndex: SliceIndex) {
  if (s.sliceIndex === sliceIndex) return;
  s.sliceIndex = sliceIndex;
  s.mouse.hover = undefined;
}
