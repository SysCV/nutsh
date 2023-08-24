import * as t from 'io-ts';
import {mustDecodeJsonStr as _mustDecodeJsonStr} from './common';
import {IProjectSpec} from './project_spec';
import {nonnegativeIntegerString} from './common';

export type Format = t.TypeOf<typeof IFormat>;
export type ResourceAnnotation = t.TypeOf<typeof IResourceAnnotation>;
export type Resource = t.TypeOf<typeof IResource>;
export type VideoResource = t.TypeOf<typeof IVideoResource>;
export type Annotation = t.TypeOf<typeof IAnnotation>;
export type Entity = t.TypeOf<typeof IEntity>;
export type CategoryList = t.TypeOf<typeof ICategoryList>;
export type ComponentList = t.TypeOf<typeof IComponentList>;
export type MaskComponent = t.TypeOf<typeof IMaskComponent>;
export type Coordinates = t.TypeOf<typeof ICoordinates>;

export function mustDecodeJsonStr(str: string): Format {
  return _mustDecodeJsonStr(IFormat, str);
}

const ISliceIndex = nonnegativeIntegerString;

const ICoordinates = t.tuple([t.number /* x */, t.number /* y */]);

const IRectangleComponent = t.tuple([ICoordinates /* top-left */, ICoordinates /* bottom-right */]);

const IPolychainComponent = t.type({
  vertices: t.array(
    t.union([
      // It is very likely that `t.union` is parsed in its defining order, and if we put the lenght-one tuple before the
      // lenght-three one, it will somehow match both length-one and length-three tuples, thus results in ignoring
      // bezier vertices. Therefore, it is crutial to put longer tuple first.
      t.tuple([ICoordinates /* p */, ICoordinates /* bezier c1 */, ICoordinates /* bezier c2 */]),
      t.tuple([ICoordinates /* p */]),
    ])
  ),
  closed: t.boolean,
});

const IRunLengthEncoding = t.type({
  cocoCounts: t.string,
  size: t.tuple([t.number /* height */, t.number /* width */]),
});

const IMaskComponent = t.intersection([
  t.type({
    rle: IRunLengthEncoding,
  }),
  t.partial({
    offset: ICoordinates,
  }),
]);

const IComponentList = t.partial({
  polychains: t.array(IPolychainComponent),
  rectangles: t.array(IRectangleComponent),
  masks: t.array(IMaskComponent),
});

const ICategoryList = t.record(t.string /* category name */, t.array(t.string /* leaf entry name */));

const IEntity = t.intersection([
  t.type({
    sliceComponents: t.record(ISliceIndex, IComponentList),
  }),
  t.partial({
    globalCategories: ICategoryList,
    sliceCategories: t.record(ISliceIndex, ICategoryList),
  }),
]);

const IAnnotation = t.type({
  entities: t.array(IEntity),
});

const IVideoResource = t.type({
  type: t.literal('video'),
  name: t.string,
  frameUrls: t.array(t.string),
});

// In the future more resource types will be supported.
const IResource = IVideoResource;

const IResourceAnnotation = t.intersection([
  t.type({
    resource: IResource,
  }),
  t.partial({
    annotation: IAnnotation,
  }),
]);

const IFormat = t.type({
  projectSpec: IProjectSpec,
  annotations: t.array(IResourceAnnotation),
});
