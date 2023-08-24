// (A subset of) https://doc.scalabel.ai/format.html#exporting-format

import * as t from 'io-ts';
import {mustDecodeJsonStr as _mustDecodeJsonStr} from './common';

export function mustDecodeJsonStr(str: string): Format {
  return _mustDecodeJsonStr(IFormat, str);
}

export type Format = t.TypeOf<typeof IFormat>;
export type Frame = t.TypeOf<typeof IFrame>;
export type Label = t.TypeOf<typeof ILabel>;
export type Poly2Ds = t.TypeOf<typeof IPoly2Ds>;
export type Box2Ds = t.TypeOf<typeof IBox2Ds>;
export type RLEs = t.TypeOf<typeof IRLEs>;
export type Config = t.TypeOf<typeof IConfig>;
export type User = t.TypeOf<typeof IAttribute>;
export type Category = {
  name: string;
  subcategories?: Category[];
};

const ICategory: t.Type<Category> = t.recursion('ICategory', () =>
  t.intersection([
    t.type({
      name: t.string,
    }),
    t.partial({
      subcategories: t.array(ICategory),
    }),
  ])
);

const IAttribute = t.type({
  name: t.string,
});

const IConfig = t.partial({
  attributes: t.array(IAttribute),
  categories: t.array(ICategory),
});

const IBox2Ds = t.array(
  t.type({
    x1: t.number,
    y1: t.number,
    x2: t.number,
    y2: t.number,
  })
);

const IRLEs = t.array(
  t.type({
    counts: t.string, // COCO string
    size: t.tuple([t.number, t.number]),
    offset: t.tuple([t.number, t.number]),
  })
);

const IPoly2Ds = t.array(
  t.type({
    vertices: t.array(t.tuple([t.number, t.number])),
    types: t.string,
    closed: t.boolean,
  })
);

const ILabel = t.intersection([
  t.type({
    id: t.string,
  }),
  t.partial({
    category: t.string,
    attributes: t.record(t.string, t.boolean),
    poly2d: IPoly2Ds,
    box2d: IBox2Ds,
    rle: IRLEs,
  }),
]);

const IFrame = t.intersection([
  t.type({
    name: t.string,
    url: t.string,
    videoName: t.string,
  }),
  t.partial({
    labels: t.array(ILabel),
  }),
]);

const IFormat = t.type({
  frames: t.array(IFrame),
  config: IConfig,
});
