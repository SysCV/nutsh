import * as t from 'io-ts';
import {nonnegativeIntegerString, mustDecodeJsonStr as _mustDecodeJsonStr} from './common';

export type Coordinates = t.TypeOf<typeof ICoordinates>;
export type Vertex = t.TypeOf<typeof IVertex>;
export type PolychainComponent = t.TypeOf<typeof IPolychainComponent>;
export type RectangleComponent = t.TypeOf<typeof IRectangleComponent>;
export type MaskComponent = t.TypeOf<typeof IMaskComponent>;
export type RunLengthEncoding = t.TypeOf<typeof IRunLengthEncoding>;
export type ComponentDetail = t.TypeOf<typeof IComponentDetail>;
export type ComponentId = t.TypeOf<typeof IComponentId>;
export type Component = t.TypeOf<typeof IComponent>;
export type ComponentMap = t.TypeOf<typeof IComponentMap>;
export type Geometry = t.TypeOf<typeof IGeometry>;
export type CategoryMap = t.TypeOf<typeof ICategoryMap>;
export type SliceIndex = t.TypeOf<typeof ISliceIndex>;
export type EntityId = t.TypeOf<typeof IEntityId>;
export type Entity = t.TypeOf<typeof IEntity>;
export type EntityMap = t.TypeOf<typeof IEntityMap>;
export type Annotation = t.TypeOf<typeof IAnnotation>;

export function mustDecodeJsonStr(str: string): Annotation {
  return _mustDecodeJsonStr(IAnnotation, str);
}

const ICoordinates = t.type({
  x: t.number,
  y: t.number,
});

const IVertex = t.intersection([
  t.type({
    coordinates: ICoordinates,
  }),
  t.partial({
    bezier: t.type({
      control1: ICoordinates,
      control2: ICoordinates,
    }),
  }),
]);

const IRectangleComponent = t.type({
  type: t.literal('rectangle'),
  topLeft: ICoordinates,
  bottomRight: ICoordinates,
});

const IPolychainComponent = t.type({
  type: t.literal('polychain'),
  vertices: t.array(IVertex),
  closed: t.boolean,
});

// The RLE representation of the mask defined by COCO at
// https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/mask.py#L7-L14
const IRunLengthEncoding = t.type({
  // Do note that the odd positions (i.e. even indices) always count the number of 0, i.e. background.
  // Respect COCO RLE to use column-major order.
  // https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/mask.py#LL51C80-L51C92
  counts: t.array(t.number),
  size: t.type({
    width: t.number,
    height: t.number,
  }),
});

const IMaskComponent = t.type({
  type: t.literal('mask'),
  rle: IRunLengthEncoding,
  offset: ICoordinates,
});

const IComponentDetail = t.union([IPolychainComponent, IRectangleComponent, IMaskComponent]);

const IComponentId = t.string;
const IComponent = t.intersection([
  t.type({
    id: IComponentId,
  }),
  IComponentDetail,
]);
const IComponentMap = t.record(IComponentId, IComponent);

const ISliceIndex = nonnegativeIntegerString;
const IGeometry = t.type({
  // Logically the key of `slices` are nonnegative integers, which should be
  // typescript `number`. However, the JSON protocol requires that the key of
  // dictionary MUST be a string. Therefore, directly setting the key of
  // `slices` to `t.number` will raise an error when decoding. Thus, we manually
  // create a type codec to encode and decode nonnegative integer strings.
  // See https://github.com/gcanti/io-ts/blob/master/index.md#the-idea
  slices: t.record(ISliceIndex, IComponentMap),
});

const ICategoryMap = t.record(t.string /* category name */, t.record(t.string /* leaf entry name */, t.literal(true)));

const IEntityId = t.string;
const IEntity = t.intersection([
  t.type({
    id: IEntityId,
    geometry: IGeometry,
  }),
  t.partial({
    sliceCategories: t.record(ISliceIndex, ICategoryMap),
    globalCategories: ICategoryMap,
  }),
]);
const IEntityMap = t.record(IEntityId, IEntity);

const IAnnotation = t.type({
  entities: IEntityMap,
});
