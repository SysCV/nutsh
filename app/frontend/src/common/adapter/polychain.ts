import {DrawStyle} from 'common/constant';
import {drawDashedLine, drawPolychain, drawVertex, polychainPath} from 'common/draw';
import {
  coordinatesImageToCanvas,
  distance,
  midpoint,
  polygonCentroid,
  polygonInPolygon,
  vertexImageToCanvas,
} from 'common/geometry';
import {deepClone} from 'common/util';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {PolychainComponent, Coordinates, ComponentDetail, Vertex} from 'type/annotation';
import {ComponentAdapter, Proximity, ScalabelExport} from './base';
import {polychainElement, pointElement, styleString} from './svg';
import {InterpolatedPoint, interpolatePolygone, interpolatePolyline} from 'common/algorithm/interpolate/polychain';
import {linearInterpoation} from 'common/algorithm/interpolate/util';

import {convertRGBA2Hex} from 'common/color';

export class Polychain extends ComponentAdapter {
  c: PolychainComponent;

  constructor(component: PolychainComponent) {
    super();
    this.c = component;
  }

  closure(): Coordinates[] {
    return this.c.vertices.map(v => v.coordinates);
  }

  centroid(): Coordinates {
    const vs = this.c.vertices;
    if (this.c.closed) {
      return polygonCentroid(vs.map(v => v.coordinates));
    }

    const n = vs.length;
    if (n % 2 === 1) {
      const i = Math.floor(vs.length / 2);
      return vs[i].coordinates;
    }

    const {x: x1, y: y1} = vs[n / 2 - 1].coordinates;
    const {x: x2, y: y2} = vs[n / 2].coordinates;
    return {x: (x1 + x2) / 2, y: (y1 + y2) / 2};
  }

  convertToScalabel(): ScalabelExport {
    const vertices: [number, number][] = [];
    const types: string[] = [];
    this.c.vertices.forEach(({coordinates: {x, y}, bezier}) => {
      if (bezier) {
        const {
          control1: {x: x1, y: y1},
          control2: {x: x2, y: y2},
        } = bezier;
        vertices.push([x1, y1], [x2, y2], [x, y]);
        types.push('CCL');
      } else {
        vertices.push([x, y]);
        types.push('L');
      }
    });
    const poly2d = {
      vertices,
      types: types.join(''),
      closed: this.c.closed,
    };
    return {poly2d};
  }

  proximity(coorImage: Coordinates): Proximity | undefined {
    let p: Proximity | undefined = undefined;

    const {vertices: vs} = this.c;
    const cs = vs.map(v => v.coordinates);
    const n = vs.length;
    for (const [i, v] of vs.entries()) {
      // vertex
      let d = distance(coorImage, v.coordinates);
      if (!p || d < p.dist) {
        p = {
          dist: d,
          info: {
            vertexIdx: i,
            midpointIdx: undefined,
            controlIdx: undefined,
          },
        };
      }

      // midpoint
      if (!vs[(i + 1) % n].bezier) {
        const m = midpoint(cs, i);
        d = distance(coorImage, m);
        if (!p || d < p.dist) {
          p = {
            dist: d,
            info: {
              vertexIdx: undefined,
              midpointIdx: i,
              controlIdx: undefined,
            },
          };
        }
      }

      // bezier control point
      if (v.bezier) {
        const {control1, control2} = v.bezier;
        d = distance(coorImage, control1);
        if (!p || d < p.dist) {
          p = {
            dist: d,
            info: {
              vertexIdx: i,
              midpointIdx: undefined,
              controlIdx: 1,
            },
          };
        }

        d = distance(coorImage, control2);
        if (!p || d < p.dist) {
          p = {
            dist: d,
            info: {
              vertexIdx: i,
              midpointIdx: undefined,
              controlIdx: 2,
            },
          };
        }
      }
    }

    return p;
  }

  contain(coorImage: Coordinates): boolean {
    const {x, y} = coorImage;

    // Since there might be bezier edges, we can not simply detect if a point
    // is inside a polygon, but to use `ctx.isPointInPath` to detect if the
    // mouse is inside a general geometry.
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const path = polychainPath(this.c.vertices, true);
    const inside = ctx.isPointInPath(path, x, y);
    canvas.remove();

    return inside;
  }

  render(ctx: CanvasRenderingContext2D, transform: ViewportTransform, style: DrawStyle): void {
    const c = this.c;

    // vertices
    const ps = c.vertices.map(v => vertexImageToCanvas(v, transform));
    drawPolychain(ctx, ps, style, c.closed);

    const n = c.vertices.length;
    c.vertices.forEach((v, idx) => {
      // midpoint
      if (!c.vertices[(idx + 1) % n].bezier && !(!c.closed && idx + 1 === n)) {
        const coors = c.vertices.map(v => v.coordinates);
        const mid = midpoint(coors, idx);
        const mid_ = coordinatesImageToCanvas(mid, transform);
        drawVertex(ctx, mid_, style.vertex);
      }
      // bezier
      if (v.bezier) {
        const {control1, control2} = v.bezier;
        const c1 = coordinatesImageToCanvas(control1, transform);
        const c2 = coordinatesImageToCanvas(control2, transform);
        drawVertex(ctx, c1, style.vertex);
        drawVertex(ctx, c2, style.vertex);

        const prev = c.vertices[(idx + n - 1) % n].coordinates;
        const p1 = coordinatesImageToCanvas(prev, transform);
        const q1 = coordinatesImageToCanvas(control1, transform);
        const p2 = coordinatesImageToCanvas(v.coordinates, transform);
        const q2 = coordinatesImageToCanvas(control2, transform);
        drawDashedLine(ctx, p1, q1, style);
        drawDashedLine(ctx, p2, q2, style);
      }
    });
  }

  svg(style: DrawStyle): string {
    const {vertices, closed} = this.c;
    const elements: string[] = [];

    // boundary
    elements.push(polychainElement(vertices, closed, style));

    // vertices
    vertices.forEach(v => {
      elements.push(pointElement(v.coordinates, style.vertex));
    });

    // bezier controls
    const n = vertices.length;
    vertices.forEach((v, i) => {
      if (!v.bezier) {
        return;
      }
      const {control1, control2} = v.bezier;
      const {x: x1, y: y1} = control1;
      const {x: x2, y: y2} = control2;
      const {x, y} = v.coordinates;
      const {x: x0, y: y0} = vertices[(i + n - 1) % n].coordinates;

      const ss = styleString({
        stroke: convertRGBA2Hex(...style.stroke),
        'stroke-width': style.lineWidth,
      });

      elements.push(`
        <g>
          <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="black" stroke-dasharray="4" vector-effect="non-scaling-stroke" style="${ss}" />
          <line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="black" stroke-dasharray="4" vector-effect="non-scaling-stroke" style="${ss}" />
        </g>
      `);
      elements.push(pointElement(control1, style.vertex));
      elements.push(pointElement(control2, style.vertex));
    });

    return `<g>${elements.join('\n')}</g>`;
  }

  isWithin(container: Coordinates[]): boolean {
    const coors = this.c.vertices.map(v => v.coordinates);
    return polygonInPolygon(coors, container);
  }

  translate(offset: Coordinates): ComponentDetail {
    const {x: dx, y: dy} = offset;

    const c = deepClone(this.c);
    c.vertices.forEach(({coordinates: coor, bezier}) => {
      coor.x += dx;
      coor.y += dy;
      if (bezier) {
        const {control1: c1, control2: c2} = bezier;
        c1.x += dx;
        c1.y += dy;
        c2.x += dx;
        c2.y += dy;
      }
    });
    return c;
  }

  interpolate(other: ComponentDetail, step: number): ComponentDetail[] {
    if (other.type !== this.c.type) return [];
    if (other.closed !== this.c.closed) return [];

    const [p1, p2] = [this.c, other];
    const ps1 = p1.vertices.map(({coordinates}, idx) => ({...coordinates, id: `p1:${idx}`}));
    const ps2 = p2.vertices.map(({coordinates}, idx) => ({...coordinates, id: `p2:${idx}`}));
    function makeVertices(ps: InterpolatedPoint[]): Vertex[] {
      return ps.map(({x, y, src1, src2, r}) => {
        // modify interpolated vertices based on their sources
        const q: Vertex = {coordinates: {x, y}};

        // only when the two source vertices are both bezier will the interpolated one be bezier
        if (src1.startsWith('p1:') && src2.startsWith('p2:')) {
          const idx1 = parseInt(src1.slice(3));
          const idx2 = parseInt(src1.slice(3));
          const v1 = p1.vertices[idx1];
          const v2 = p2.vertices[idx2];
          if (v1.bezier && v2.bezier) {
            const {control1: c1, control2: c2} = v1.bezier;
            const {control1: c1_, control2: c2_} = v2.bezier;
            q.bezier = {
              control1: linearInterpoation(c1, c1_, r),
              control2: linearInterpoation(c2, c2_, r),
            };
          }
        }
        return q;
      });
    }

    const closed = this.c.closed;
    const interpolated = (closed ? interpolatePolygone : interpolatePolyline)(ps1, ps2, step);
    return interpolated.map(ps => ({type: 'polychain', closed, vertices: makeVertices(ps)}));
  }
}
