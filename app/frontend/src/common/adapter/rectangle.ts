import {DrawStyle} from 'common/constant';
import {drawPolychain} from 'common/draw';
import {distance, polygonInPolygon, vertexImageToCanvas} from 'common/geometry';
import {deepClone} from 'common/util';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {RectangleComponent, Coordinates, ComponentDetail} from 'type/annotation';
import {ComponentAdapter, Proximity, ScalabelExport} from './base';
import {polychainElement, pointElement} from './svg';
import {interpolateRectangle} from 'common/algorithm/interpolate/rectangle';

export class Rectangle extends ComponentAdapter {
  c: RectangleComponent;

  constructor(component: RectangleComponent) {
    super();
    this.c = component;
  }

  closure(): Coordinates[] {
    return [this.c.topLeft, this.c.bottomRight];
  }

  centroid(): Coordinates {
    const {topLeft: p, bottomRight: q} = this.c;
    return {
      x: Math.round((p.x + q.x) / 2),
      y: Math.round((p.y + q.y) / 2),
    };
  }

  convertToScalabel(): ScalabelExport {
    const {topLeft: p, bottomRight: q} = this.c;
    const box2d = {x1: p.x, y1: p.y, x2: q.x, y2: q.y};
    return {box2d};
  }

  proximity(coorImage: Coordinates): Proximity | undefined {
    const vs = this.vertices();
    let p: Proximity | undefined = undefined;
    vs.forEach((v, vertexIdx) => {
      const d = distance(coorImage, v);
      if (!p || d < p.dist) {
        p = {dist: d, info: {vertexIdx}};
      }
    });
    return p;
  }

  contain(coorImage: Coordinates): boolean {
    const {
      topLeft: {x: x1, y: y1},
      bottomRight: {x: x2, y: y2},
    } = this.c;
    const {x, y} = coorImage;
    return x1 < x && x < x2 && y1 < y && y < y2;
  }

  render(ctx: CanvasRenderingContext2D, transform: ViewportTransform, style: DrawStyle): void {
    const vs = this.vertices();
    const ps = vs.map(v => vertexImageToCanvas({coordinates: v}, transform));
    drawPolychain(ctx, ps, style, true);
  }

  svg(style: DrawStyle): string {
    const vs = this.vertices();
    const elements: string[] = [];

    // boundary
    const vertices = vs.map(v => ({coordinates: v}));
    elements.push(polychainElement(vertices, true, style));

    // vertices
    vs.forEach(v => {
      elements.push(pointElement(v, style.vertex));
    });

    return `<g>${elements.join('\n')}</g>`;
  }

  isWithin(container: Coordinates[]): boolean {
    const vs = this.vertices();
    return polygonInPolygon(vs, container);
  }

  vertices(): Coordinates[] {
    const {
      topLeft: {x: x1, y: y1},
      bottomRight: {x: x2, y: y2},
    } = this.c;
    return [
      {x: x1, y: y1},
      {x: x2, y: y1},
      {x: x2, y: y2},
      {x: x1, y: y2},
    ];
  }

  translate(offset: Coordinates): ComponentDetail {
    const {x: dx, y: dy} = offset;

    const c = deepClone(this.c);
    const {topLeft: p, bottomRight: q} = c;
    p.x += dx;
    p.y += dy;
    q.x += dx;
    q.y += dy;
    return c;
  }

  interpolate(other: ComponentDetail, step: number): ComponentDetail[] {
    if (other.type !== this.c.type) return [];
    const {topLeft: p1, bottomRight: q1} = this.c;
    const {topLeft: p2, bottomRight: q2} = other;
    const rects = interpolateRectangle([p1, q1], [p2, q2], step);
    return rects.map(([p, q]) => ({type: 'rectangle', topLeft: p, bottomRight: q}));
  }
}
