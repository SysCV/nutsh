import type {DrawStyle, VertexStyle, BaseStyle} from 'common/constant';
import type {Vertex, Coordinates} from 'type/annotation';
import {convertRGBA2Hex} from './color';

export function iterateVertices(
  vertices: Vertex[],
  callbacks: {
    onStart: (coor: Coordinates) => void;
    onLine: (coor: Coordinates) => void;
    onBezier: (c1: Coordinates, c2: Coordinates, end: Coordinates) => void;
  },
  options: {closed?: boolean} = {closed: true}
): void {
  const {closed} = options;
  const {onStart, onLine, onBezier} = callbacks;

  const n = vertices.length;
  const startIdx = 0;
  const endIdx = closed ? startIdx + n : startIdx + n - 1;

  onStart(vertices[startIdx].coordinates);
  for (let i = startIdx + 1; i <= endIdx; i++) {
    const idx = i % n;
    const {bezier, coordinates} = vertices[idx];

    if (bezier) {
      onBezier(bezier.control1, bezier.control2, coordinates);
    } else {
      onLine(coordinates);
    }
  }
}

export function drawPolychain(
  ctx: CanvasRenderingContext2D,
  vertices: Vertex[],
  style: DrawStyle,
  closed: boolean
): void {
  if (vertices.length === 0) {
    return;
  }

  ctx.save();

  ctx.lineWidth = style.lineWidth;
  ctx.lineJoin = 'round';

  ctx.strokeStyle = convertRGBA2Hex(...style.stroke);
  if (style.fill && closed) {
    ctx.fillStyle = convertRGBA2Hex(...style.fill);
  }

  const path = polychainPath(vertices, closed);
  ctx.stroke(path);
  if (style.fill && closed) {
    ctx.fill(path);
  }

  // draw vertex
  vertices.forEach(({coordinates}) => {
    drawVertex(ctx, coordinates, style.vertex);
  });

  ctx.restore();
}

export function polychainPath(vertices: Vertex[], closed: boolean): Path2D {
  const path = new Path2D();
  iterateVertices(
    vertices,
    {
      onStart: ({x, y}) => path.moveTo(x, y),
      onLine: ({x, y}) => path.lineTo(x, y),
      onBezier: ({x: x1, y: y1}, {x: x2, y: y2}, {x, y}) => path.bezierCurveTo(x1, y1, x2, y2, x, y),
    },
    {closed}
  );
  return path;
}

export function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  start: Coordinates,
  end: Coordinates,
  style: BaseStyle
): void {
  ctx.save();

  ctx.lineWidth = style.lineWidth;
  ctx.strokeStyle = convertRGBA2Hex(...style.stroke);

  const {x: x1, y: y1} = start;
  const {x: x2, y: y2} = end;
  ctx.beginPath();
  ctx.setLineDash([4]);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

export function drawVertex(ctx: CanvasRenderingContext2D, point: Coordinates, style: VertexStyle): void {
  ctx.save();

  ctx.lineWidth = style.lineWidth;

  ctx.strokeStyle = convertRGBA2Hex(...style.stroke);
  if (style.fill) {
    ctx.fillStyle = convertRGBA2Hex(...style.fill);
  }

  const {x, y} = point;
  const r = style.radius;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);

  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

export function drawRect(ctx: CanvasRenderingContext2D, p: Coordinates, q: Coordinates, style: BaseStyle): void {
  const x = Math.min(p.x, q.x);
  const y = Math.min(p.y, q.y);
  const w = Math.abs(p.x - q.x);
  const h = Math.abs(p.y - q.y);

  ctx.save();

  ctx.lineWidth = style.lineWidth;
  ctx.lineJoin = 'round';

  ctx.strokeStyle = convertRGBA2Hex(...style.stroke);
  if (style.fill) {
    ctx.fillStyle = convertRGBA2Hex(...style.fill);
  }

  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.closePath();

  ctx.stroke();
  if (style.fill) {
    ctx.fill();
  }

  ctx.restore();
}
