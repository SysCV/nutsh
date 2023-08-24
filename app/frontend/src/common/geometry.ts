import * as geometric from 'geometric';
import polylabel from 'polylabel';
import type {Coordinates, Vertex} from 'type/annotation';
import type {ViewportTransform} from 'state/annotate/render/viewport';

export function distance(p: Coordinates, q: Coordinates): number {
  return geometric.lineLength([
    [p.x, p.y],
    [q.x, q.y],
  ]);
}

export function midpoint(vertices: Coordinates[], idx: number): Coordinates {
  const {x: x1, y: y1} = vertices[idx];
  const {x: x2, y: y2} = vertices[(idx + 1) % vertices.length];
  return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
}

export function pointInPolygon(target: Coordinates, polygon: Coordinates[]): boolean {
  return geometric.pointInPolygon(
    [target.x, target.y],
    polygon.map(p => [p.x, p.y])
  );
}

export function polygonInPolygon(target: Coordinates[], surround: Coordinates[]): boolean {
  const inner: geometric.Polygon = target.map(p => [p.x, p.y]);
  const outer: geometric.Polygon = surround.map(p => [p.x, p.y]);
  return geometric.polygonInPolygon(inner, outer);
}

export function polygonCentroid(vertices: Coordinates[]): Coordinates {
  // Use `polylabel` to correctly handle concave polygons.
  const [x, y] = polylabel([vertices.map(({x, y}) => [x, y])]);
  return {x, y};
}

export function findBoundingBox(boundaries: Coordinates[][]): Rect {
  let [minX, minY, maxX, maxY] = [
    Number.MAX_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
    -Number.MAX_SAFE_INTEGER,
    -Number.MAX_SAFE_INTEGER,
  ];

  boundaries.forEach(ps =>
    ps.forEach(({x, y}) => {
      minX = Math.min(x, minX);
      minY = Math.min(y, minY);
      maxX = Math.max(x, maxX);
      maxY = Math.max(y, maxY);
    })
  );

  return {x: minX, y: minY, width: maxX - minX, height: maxY - minY};
}

export type Rect = RectSize & {
  x: number;
  y: number;
};

export type RectSize = {
  width: number;
  height: number;
};

/**
 * Calculate the transformation to fit a rectangle into another one while keeping aspect ratio.
 * @param target The target rectangle.
 * @param container The container rectangle.
 * @returns The transformation to fit the target inside the container.
 */
export function rectFitTransform(target: RectSize, container: RectSize): ViewportTransform {
  const {width: w0, height: h0} = container;
  const {width: w1, height: h1} = target;

  const r = Math.min(w0 / w1, h0 / h1);
  const dx = (w0 - w1 * r) / 2;
  const dy = (h0 - h1 * r) / 2;

  return {scale: r, translation: [dx, dy]};
}

export function vertexImageToCanvas(vertex: Vertex, transform: ViewportTransform): Vertex {
  const {coordinates: coor, bezier} = vertex;
  const coordinates = coordinatesImageToCanvas(coor, transform);
  if (bezier) {
    const control1 = coordinatesImageToCanvas(bezier.control1, transform);
    const control2 = coordinatesImageToCanvas(bezier.control2, transform);
    return {...vertex, coordinates, bezier: {control1, control2}};
  } else {
    return {...vertex, coordinates};
  }
}

export function coordinatesImageToCanvas(coor: Coordinates, transform: ViewportTransform): Coordinates {
  const {
    scale: r,
    translation: [dx, dy],
  } = transform;
  const {x, y} = coor;
  return {x: dx + x * r, y: dy + y * r};
}

export function coordinatesCanvasToImage(coor: Coordinates, transform: ViewportTransform): Coordinates {
  const {
    scale: r,
    translation: [dx, dy],
  } = transform;
  const {x, y} = coor;
  return {x: (x - dx) / r, y: (y - dy) / r};
}

export function limitCoordinates(p: Coordinates, w: number, h: number): Coordinates {
  let {x, y} = p;
  x = Math.max(Math.min(x, w), 0);
  y = Math.max(Math.min(y, h), 0);
  return {x, y};
}

export function limitGrid(p: Coordinates, w: number, h: number): Coordinates {
  let {x, y} = p;
  x = Math.max(Math.min(Math.round(x), w - 1), 0);
  y = Math.max(Math.min(Math.round(y), h - 1), 0);
  return {x, y};
}
