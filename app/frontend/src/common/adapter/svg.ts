import {convertRGBA2Hex} from 'common/color';
import {DrawStyle, VertexStyle} from 'common/constant';
import {iterateVertices} from 'common/draw';
import {Coordinates, Vertex} from 'type/annotation';

export function polychainElement(vertices: Vertex[], closed: boolean, style: DrawStyle): string {
  const ss = styleString({
    stroke: convertRGBA2Hex(...style.stroke),
    'stroke-width': style.lineWidth,
    fill: closed && style.fill ? convertRGBA2Hex(...style.fill) : 'none',
  });

  const ds: string[] = [];
  iterateVertices(
    vertices,
    {
      onStart: ({x, y}) => ds.push(`M ${x} ${y}`),
      onLine: ({x, y}) => ds.push(`L ${x} ${y}`),
      onBezier: ({x: x1, y: y1}, {x: x2, y: y2}, {x, y}) => ds.push(`C ${x1} ${y1}, ${x2} ${y2}, ${x} ${y}`),
    },
    {closed}
  );
  const d = ds.join(' ');

  // Set `vector-effect="non-scaling-stroke"` to keep line width upon
  // scaling. See https://stackoverflow.com/a/1304602/797225
  return `<path d="${d}" vector-effect="non-scaling-stroke" style="${ss}" />`;
}

export function pointElement(coor: Coordinates, style: VertexStyle): string {
  const {x, y} = coor;
  const {radius, lineWidth, stroke: strokeRGBA, fill: fillRGBA} = style;
  const stroke = convertRGBA2Hex(...strokeRGBA);
  const fill = convertRGBA2Hex(...fillRGBA);

  const r = radius;
  const inner = r * 2;
  const outer = inner - lineWidth;
  const epsilon = 0.0001;
  return `
    <g>
      <path d="M ${x} ${y} l ${epsilon} 0" vector-effect="non-scaling-stroke" stroke-width="${inner}" stroke-linecap="round" stroke="${stroke}" />
      <path d="M ${x} ${y} l ${epsilon} 0" vector-effect="non-scaling-stroke" stroke-width="${outer}" stroke-linecap="round" stroke="${fill}" />
    </g>
  `;
}

type StyleDict = {
  [key: string]: string | number | undefined;
};

export function styleString(styles: StyleDict): string {
  return Object.entries(styles)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
