import {v4 as uuidv4} from 'uuid';

import {emptyAnnotation} from 'state/annotate/render';
import {Box2Ds, Poly2Ds, RLEs} from 'type/scalabel';

import type {ImportProjectReq, CreateProjectReq} from 'openapi/nutsh';
import type {Annotation, Component, Vertex} from 'type/annotation';
import type {ProjectSpec, Entry, Category as ProjectCategory} from 'type/project_spec';
import type {Format, Category} from 'type/scalabel';

import {Category as CategoryConstant} from './constant';
import {rleCountsFromStringCOCO} from 'common/algorithm/rle';
import {ProjectForm} from 'type/app';

function convertNutshCategory(cat: Category): Entry {
  return {
    name: cat.name,
    subentries: cat.subcategories?.map(convertNutshCategory),
  };
}

export async function mustConvert(decoded: Format, form: ProjectForm): Promise<ImportProjectReq> {
  // project
  const labels = decoded.config.categories?.map(convertNutshCategory) ?? [];
  const attrs = decoded.config.attributes?.map(({name}) => ({name})) ?? [];
  const categories: ProjectCategory[] = [];
  if (labels.length > 0) {
    categories.push({
      name: CategoryConstant.label,
      entries: labels,
    });
  }
  if (attrs.length > 0) {
    categories.push({
      name: CategoryConstant.attribute,
      multiple: true,
      slicewise: true,
      entries: attrs,
    });
  }
  const spec: ProjectSpec = {categories};
  const project: CreateProjectReq = {...form, spec_json: JSON.stringify(spec)};

  // video
  const videos = new Map<string, string[]>();
  const annos = new Map<string, Annotation>();
  decoded.frames.forEach(f => {
    const vname = f.videoName;

    // frame url
    if (!videos.has(vname)) {
      videos.set(vname, []);
    }
    const frames = videos.get(vname);
    if (!frames) return;
    frames.push(f.url);
    const sliceIdx = frames.length - 1;

    // annotation
    if (!f.labels) return;
    if (!annos.has(vname)) {
      annos.set(vname, emptyAnnotation());
    }
    const anno = annos.get(vname);
    if (!anno) return;

    f.labels.forEach(l => {
      if (!(l.id in anno.entities)) {
        anno.entities[l.id] = {
          id: l.id,
          geometry: {slices: {}},
        };
      }
      const e = anno.entities[l.id];

      // geometry
      const poly2ds = l.poly2d?.map(mustConvertPoly2D) ?? [];
      const box2ds = l.box2d?.map(mustConvertBox2D) ?? [];
      const rles = l.rle?.map(mustConvertRLE) ?? [];
      const components = [...poly2ds, ...box2ds, ...rles].map(c => [c.id, c]);
      if (components.length > 0) {
        e.geometry.slices[sliceIdx] = Object.fromEntries(components);
      }

      // `category` in old format corresponds to global catgegories. Although it should be checked that a `label`
      // has identical `category` cross all frames, it is fine to ignore the inconsistency for human carelessness.
      if (l.category) {
        if (!e.globalCategories) e.globalCategories = {};
        e.globalCategories[CategoryConstant.label] = {[l.category]: true};
      }
      if (l.attributes) {
        const attrs: {[key: string]: true} = {};
        for (const [k, v] of Object.entries(l.attributes)) {
          if (v) {
            attrs[k] = true;
          }
        }
        if (Object.keys(attrs).length > 0) {
          if (!e.sliceCategories) e.sliceCategories = {};
          if (!e.sliceCategories[sliceIdx]) e.sliceCategories[sliceIdx] = {};
          e.sliceCategories[sliceIdx][CategoryConstant.attribute] = attrs;
        }
      }
    });
  });

  return {
    project,
    videos: Array.from(videos).map(([name, frame_urls]) => ({
      name,
      frame_urls,
    })),
    annotations: Object.fromEntries(Array.from(annos).map(([video, a]) => [video, JSON.stringify(a)])),
  };
}

function mustConvertPoly2D(p: Poly2Ds[number]): Component {
  const id = uuidv4();
  const n = p.vertices.length;

  if (p.types.length !== p.vertices.length) {
    throw new Error('error.project.import.mismatch_vertices_types');
  }

  const startIdx = 0;
  const vertices: Vertex[] = [];
  for (let i = startIdx; i < startIdx + n; i++) {
    const idx = i % n;
    const [x, y] = p.vertices[idx];
    const vtype = p.types[idx];

    switch (vtype) {
      case 'L': {
        vertices.push({coordinates: {x, y}});
        continue;
      }
      case 'C': {
        if (i + 1 === startIdx + n) {
          throw new Error('error.project.import.vertex_unexpected_type');
        }
        const idx1 = (i + 1) % n;

        if (i + 2 === startIdx + n) {
          throw new Error('error.project.import.vertex_unexpected_type');
        }
        const idx2 = (i + 2) % n;

        const vtype1 = p.types[idx1];
        const vtype2 = p.types[idx2];
        if (vtype1 !== 'C') {
          throw new Error('error.project.import.vertex_unexpected_type');
        }
        if (vtype2 !== 'L') {
          throw new Error('error.project.import.vertex_unexpected_type');
        }

        const [x1, y1] = p.vertices[idx1];
        const [x2, y2] = p.vertices[idx2];
        vertices.push({
          coordinates: {x: x2, y: y2},
          bezier: {control1: {x, y}, control2: {x: x1, y: y1}},
        });
        i += 2;
      }
    }
  }
  return {id, vertices, type: 'polychain', closed: p.closed};
}

function mustConvertBox2D(b: Box2Ds[number]): Component {
  const id = uuidv4();
  return {
    id,
    type: 'rectangle',
    topLeft: {x: b.x1, y: b.y1},
    bottomRight: {x: b.x2, y: b.y2},
  };
}

function mustConvertRLE(r: RLEs[number]): Component {
  const id = uuidv4();
  const counts = rleCountsFromStringCOCO(r.counts);
  const [height, width] = r.size;
  const [x, y] = r.offset;
  return {
    id,
    type: 'mask',
    rle: {
      counts,
      size: {width, height},
    },
    offset: {x, y},
  };
}
