import {newComponentAdapter} from 'common/adapter';

import type {Annotation, SliceIndex} from 'type/annotation';
import type {ProjectSpec, Entry} from 'type/project_spec';
import type {Format, Category, Frame, Label, Poly2Ds, Box2Ds, RLEs} from 'type/scalabel';

import {Category as CategoryConstant} from './constant';
import {VideoAnnotation} from '..';

function mustConvertEntry(ent: Entry): Category {
  const cat: Category = {
    name: ent.name,
  };
  const sub = ent.subentries?.map(mustConvertEntry);
  if (sub) {
    cat.subcategories = sub;
  }
  return cat;
}

function mustConvertAnnotation(anno: Annotation, sidx: SliceIndex): Label[] {
  const {entities} = anno;

  const labels: Label[] = [];
  for (const [, e] of Object.entries(entities)) {
    const label: Label = {
      id: e.id,
    };
    const cats = {...(e.sliceCategories?.[sidx] ?? {}), ...(e.globalCategories ?? {})};
    if (cats) {
      const attr = cats[CategoryConstant.attribute];
      if (attr) {
        label.attributes = {...attr};
      }
      const labl = cats[CategoryConstant.label];
      if (labl) {
        const keys = Object.keys(labl);
        const n = keys.length;
        if (n > 1) {
          console.error(`entity ${e.id} has ${n} ${CategoryConstant.label} categories`);
          throw new Error('error.project.export.entity_labels_wrong_number');
        }
        if (n === 1) {
          label.category = keys[0];
        }
      }
    }

    const poly2ds: Poly2Ds = [];
    const box2ds: Box2Ds = [];
    const rles: RLEs = [];
    const slice = e.geometry.slices[sidx] ?? {};
    for (const [, c] of Object.entries(slice)) {
      const adapter = newComponentAdapter(c);
      const {poly2d, box2d, rle} = adapter.convertToScalabel();
      if (poly2d) {
        poly2ds.push(poly2d);
      }
      if (box2d) {
        box2ds.push(box2d);
      }
      if (rle) {
        rles.push(rle);
      }
    }

    let hasLabel = false;
    if (poly2ds.length > 0) {
      label.poly2d = poly2ds;
      hasLabel = true;
    }
    if (box2ds.length > 0) {
      label.box2d = box2ds;
      hasLabel = true;
    }
    if (rles.length > 0) {
      label.rle = rles;
      hasLabel = true;
    }

    if (hasLabel) {
      labels.push(label);
    }
  }

  return labels;
}

function mustConvertVideoAnnotation(videoAnnos: VideoAnnotation): Frame[] {
  const {video, frameUrls, annotation: anno} = videoAnnos;
  return frameUrls.map((furl, idx) => {
    const labels = anno ? mustConvertAnnotation(anno, idx) : undefined;
    return {
      name: `${video.name}:${idx}`,
      url: furl,
      videoName: video.name,
      labels,
    };
  });
}

export function mustConvert(projectSpec: ProjectSpec, videoAnnos: VideoAnnotation[]): Format {
  const output: Format = {
    frames: [],
    config: {},
  };

  const {categories = []} = projectSpec;

  // `categories` are expected to be at most two with certain names
  if (categories.length > 2) {
    console.error(`expected no more than two categories, got ${categories.length}`);
    throw new Error('error.project.export.invalid_categories');
  }
  const attr = categories.find(cat => cat.name === CategoryConstant.attribute);
  const labl = categories.find(cat => cat.name === CategoryConstant.label);

  if (attr) {
    // `attr` should be `multiple` with only one-level entries
    if (!attr.multiple) {
      console.error(`expected ${CategoryConstant.attribute} category to be multiple`);
      throw new Error('error.project.export.invalid_categories');
    }
    output.config.attributes = [];
    attr.entries.forEach(ent => {
      if ((ent.subentries?.length ?? 0) > 0) {
        console.error(`expected ${CategoryConstant.attribute} category to be flat`);
        throw new Error('error.project.export.invalid_categories');
      }
      output.config.attributes?.push({
        name: ent.name,
      });
    });
  }
  if (labl) {
    // `labl` should be `non-multiple` with arbitrary hierarchy
    if (labl.multiple) {
      console.error(`expected ${CategoryConstant.label} category to not be multiple`);
      throw new Error('error.project.export.invalid_categories');
    }
    output.config.categories = [];
    labl.entries.forEach(ent => {
      output.config.categories?.push(mustConvertEntry(ent));
    });
  }

  // frames
  const frames = videoAnnos.map(mustConvertVideoAnnotation).flat();
  output.frames = frames;

  return output;
}
