import type {ProjectSpec} from 'type/project_spec';
import type {
  Format,
  Annotation as AnnotationExternal,
  CategoryList,
  Entity as EntityExternal,
  ComponentList as ComponentListExternal,
  Coordinates as CoordinatesExternal,
  ResourceAnnotation,
} from 'type/serialization';
import type {
  Annotation as AnnotationInternal,
  CategoryMap,
  Entity as EntityInternal,
  ComponentMap as ComponentMapInternal,
  Coordinates as CoordinatesInternal,
} from 'type/annotation';

import {VideoAnnotation} from '..';
import {rleCountsToStringCOCO} from 'common/algorithm/rle';

export function mustConvert(projectSpec: ProjectSpec, videoAnnos: VideoAnnotation[]): Format {
  return {
    projectSpec: projectSpec,
    annotations: videoAnnos.map(({video: {name}, frameUrls, annotation}) => {
      const a: ResourceAnnotation = {
        resource: {
          type: 'video',
          name,
          frameUrls: frameUrls,
        },
      };
      if (annotation) {
        a.annotation = mustConvertAnnotation(annotation);
      }
      return a;
    }),
  };
}

function mustConvertAnnotation(a: AnnotationInternal): AnnotationExternal {
  return {
    entities: Object.values(a.entities).map(mustConvertEntity),
  };
}

function mustConvertEntity(e: EntityInternal): EntityExternal {
  const {
    geometry: {slices},
    sliceCategories: scats,
    globalCategories: gcats,
  } = e;
  const sliceCategories = scats
    ? Object.fromEntries(Object.entries(scats).map(([sidx, catEntries]) => [sidx, categoryMapToList(catEntries)]))
    : undefined;
  const globalCategories = gcats ? categoryMapToList(gcats) : undefined;

  const e_: EntityExternal = {
    sliceComponents: Object.fromEntries(
      Object.entries(slices).map(([sidx, componentList]) => [sidx, mustConvertComponentMap(componentList)])
    ),
  };
  if (sliceCategories) {
    e_.sliceCategories = sliceCategories;
  }
  if (globalCategories) {
    e_.globalCategories = globalCategories;
  }
  return e_;
}

function mustConvertComponentMap(componentMap: ComponentMapInternal): ComponentListExternal {
  const clist: ComponentListExternal = {};

  Object.values(componentMap).map(c => {
    switch (c.type) {
      case 'polychain': {
        if (!clist.polychains) clist.polychains = [];
        clist.polychains.push({
          closed: c.closed,
          vertices: c.vertices.map(vs =>
            vs.bezier ? [cc(vs.coordinates), cc(vs.bezier.control1), cc(vs.bezier.control2)] : [cc(vs.coordinates)]
          ),
        });
        break;
      }
      case 'rectangle': {
        if (!clist.rectangles) clist.rectangles = [];
        clist.rectangles.push([cc(c.topLeft), cc(c.bottomRight)]);
        break;
      }
      case 'mask': {
        const {width, height} = c.rle.size;
        if (!clist.masks) clist.masks = [];
        clist.masks.push({
          offset: cc(c.offset),
          rle: {
            size: [height, width],
            cocoCounts: rleCountsToStringCOCO(c.rle.counts),
          },
        });
        break;
      }
    }
  });

  return clist;
}

function categoryMapToList(catEntries: CategoryMap): CategoryList {
  return Object.fromEntries(Object.entries(catEntries).map(([cat, entries]) => [cat, Object.keys(entries)]));
}

function cc(coor: CoordinatesInternal): CoordinatesExternal {
  const {x, y} = coor;
  return [x, y];
}
