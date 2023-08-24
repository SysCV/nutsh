import {v4 as uuidv4} from 'uuid';
import {rleCountsFromStringCOCO, shrink} from 'common/algorithm/rle';
import type {ImportProjectReq, CreateProjectReq} from 'openapi/nutsh';
import type {
  Format,
  Annotation as AnnotationExternal,
  CategoryList,
  Entity as EntityExternal,
  ComponentList as ComponentListExternal,
  Coordinates as CoordinatesExternal,
} from 'type/serialization';
import type {
  Annotation as AnnotationInternal,
  CategoryMap,
  Entity as EntityInternal,
  EntityId,
  ComponentMap as ComponentMapInternal,
  ComponentId,
  Coordinates as CoordinatesInternal,
  MaskComponent as MaskComponentInternal,
} from 'type/annotation';
import {ProjectForm} from 'type/app';

export function mustConvert(decoded: Format, form: ProjectForm): ImportProjectReq {
  const {projectSpec: spec, annotations: anno} = decoded;

  // project
  const project: CreateProjectReq = {...form, spec_json: JSON.stringify(spec)};

  // video
  const videos = anno.map(({resource: {name, frameUrls}}) => ({name, frame_urls: frameUrls}));

  // annotation
  const aes: [string, AnnotationInternal][] = [];
  for (const {resource, annotation: a} of anno) {
    if (!a) continue;
    const ae = mustConvertAnnotation(a);
    const {name} = resource;
    aes.push([name, ae]);
  }

  const annotations = Object.fromEntries(aes.map(([name, a]) => [name, JSON.stringify(a)]));

  return {project, videos, annotations};
}

function mustConvertAnnotation(a: AnnotationExternal): AnnotationInternal {
  return {
    entities: Object.fromEntries(
      a.entities.map(e => {
        const eid: EntityId = uuidv4();
        return [eid, mustConvertEntity(e, eid)];
      })
    ),
  };
}

function mustConvertEntity(e: EntityExternal, id: EntityId): EntityInternal {
  const {sliceComponents: scs, sliceCategories: scats, globalCategories: gcats} = e;
  const sliceCategories = scats
    ? Object.fromEntries(Object.entries(scats).map(([sidx, catEntries]) => [sidx, categoryListToMap(catEntries)]))
    : undefined;
  const globalCategories = gcats ? categoryListToMap(gcats) : undefined;
  return {
    id,
    sliceCategories,
    globalCategories,
    geometry: {
      slices: Object.fromEntries(
        Object.entries(scs).map(([sidx, componentList]) => {
          return [sidx, mustConvertComponentList(componentList)];
        })
      ),
    },
  };
}

function mustConvertComponentList(componentList: ComponentListExternal): ComponentMapInternal {
  const cmap: ComponentMapInternal = {};

  // polychain
  componentList.polychains?.forEach(({closed, vertices}) => {
    const cid: ComponentId = uuidv4();
    cmap[cid] = {
      id: cid,
      type: 'polychain',
      closed,
      vertices: vertices.map(vs => ({
        coordinates: cc(vs[0]),
        bezier: vs.length === 3 ? {control1: cc(vs[1]), control2: cc(vs[2])} : undefined,
      })),
    };
  });

  // rectangle
  componentList.rectangles?.forEach(([p, q]) => {
    const id: ComponentId = uuidv4();
    cmap[id] = {id, type: 'rectangle', topLeft: cc(p), bottomRight: cc(q)};
  });

  // mask
  const masks: MaskComponentInternal[] = [];
  componentList.masks?.forEach(({rle, offset}) => {
    const [height, width] = rle.size;
    const counts = rleCountsFromStringCOCO(rle.cocoCounts);
    if (offset) {
      const [x, y] = offset;
      masks.push({
        type: 'mask',
        offset: {x, y},
        rle: {size: {width, height}, counts},
      });
    } else {
      // determine the bounding box when `offset` is missing
      const shrinked = shrink({counts, size: {width, height}});
      if (shrinked) {
        masks.push({
          type: 'mask',
          offset: shrinked.offset,
          rle: shrinked.rle,
        });
      }
    }
  });

  masks.forEach(mask => {
    if (mask) {
      const id: ComponentId = uuidv4();
      cmap[id] = {id, ...mask};
    }
  });

  return cmap;
}

function categoryListToMap(catEntries: CategoryList): CategoryMap {
  return Object.fromEntries(
    Object.entries(catEntries).map(([cat, entries]) => [cat, Object.fromEntries(entries.map(entry => [entry, true]))])
  );
}

function cc(coor: CoordinatesExternal): CoordinatesInternal {
  const [x, y] = coor;
  return {x, y};
}
