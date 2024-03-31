A [project](/Concept#project) can be serialized in JSON format for importing and exporting.

:::tip

Check [app/frontend/src/type/serialization.ts](https://github.com/SysCV/nutsh/blob/main/app/frontend/src/type/serialization.ts) for the schema definition in code.

:::

The JSON is in the following schema.

```typescript
type Serialization = {
  // project specification
  projectSpec: ProjectSpecification;

  // resource annotations
  annotations: ResourceAnnotation[];
};
```

For details on the `projectSpec` field, see the [project specification schema](/Usage/Project#specification).

A `ResourceAnnotation` represents a resource together with its (optional) annotation, and is defined as follows:

```typescript
type ResourceAnnotation = {
  // for now only video resources are supported
  resource: VideoResource;

  // an optional annotation for this resource
  annotation?: Annotation;
};

type VideoResource = {
  type: "video";

  // name of the video
  name: string;

  // frame urls of the video
  frameUrls: string[];
};
```

The `Annotation` is defined as

```typescript
type Annotation = {
  // set of entities
  entities: Entity[];
};

type Entity = {
  // components on each slice
  slices: { [key: number /* slice index */]: ComponentList };

  // slice-wise categories
  sliceCategories: { [key: number /* slice index */]: CategoryList };

  // global categories
  globalCategories: CategoryList;
};

type CategoryList = {
  [key: string /* category name */]: string[] /* array of leaf entry names */;
};

type ComponentList = {
  // polychains
  polychains?: Polychain[];

  // rectangles
  rectangles?: Rectangle[];

  // masks
  masks?: Mask[];
};
```

`ComponentList` collects components of different types. Their definitions are given in the following sections. All coordinates in them are represented by a 2-tuple:

```typescript
type Coordinates = [number /* x */, number /* y */];
```

## Polychain

[Polygons](/Usage/Video/Drawing/Polygon) and [polylines](/Usage/Video/Drawing/Polyline) are collectively known as [polygonal chains](https://en.wikipedia.org/wiki/Polygonal_chain), or "_polychain_" in short. A closed polychain is a polygon while an open one is a polyline.

A polychain is represented by its vertex sequence together with a flag telling if it is closed.

```typescript
type Polychain = {
  // if the polychain is closed or not
  closed: boolean;

  // the list of polychain vertices
  vertices: Vertex[];
};

// a vertex can either be a 1-tuple or a 3-tuple of coordinates representing a normal or a bézier vertex respectively
type Vertex = VertexNormal | VertexBezier;
type VertexNormal = [Coordinates /* v */];
type VertexBezier = [Coordinates /* v */, Coordinates /* c1 */, Coordinates /* c2 */];
```

Every vertex in a polychain can be classified as either a normal or a Bézier vertex:

- A normal vertex is represented as `[v]` where `v` denotes its coordinates.
- A Bézier vertex is represented by three coordinates `[v, c1, c2]`. Alongside the preceding vertex, labeled `u`, these four vertices form the quartet necessary to draw a [cubic Bézier curve](/Usage/Video/Drawing/Polygon#bézier-curve):
  - `u`: The starting point.
  - `v`: The ending point.
  - `c1`: The first control point.
  - `c2`: The second control point.

:::caution

In the context of a polygon, every vertex has a predecessor. However, for a polyline, the initial vertex lacks a predecessor. Consequently, the starting vertex of a polyline cannot be a Bézier vertex.

:::

## Rectangle

A [rectangle](/Usage/Video/Drawing/Rectangle) is represented by its top-left and bottom-right vertices.

```typescript
type Rectangle = [Coordinates /* top-left */, Coordinates /* bottom-right */];
```

## Mask

A [mask](/Usage/Video/Drawing/Mask) is represented by [COCO RLE](https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/PythonAPI/pycocotools/mask.py) within the bounding box of the masked area.

```typescript
type Mask = {
  rle: RLE;

  // the top-left location of the bounding box
  offset?: Coordinates;
};

type RLE = {
  // the COCO RLE counts string of the mask in column-major order
  cocoCounts: string;

  // the size of the bounding box
  size: [number /* height */, number /* width */];
};
```
