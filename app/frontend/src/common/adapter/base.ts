import {DrawStyle} from 'common/constant';
import {ProximityDetail} from 'state/annotate/render/mouse';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {ComponentDetail, Coordinates} from 'type/annotation';
import {Poly2Ds, Box2Ds, RLEs} from 'type/scalabel';

export abstract class ComponentAdapter {
  abstract closure(): Coordinates[];
  abstract centroid(): Coordinates;
  abstract translate(offset: Coordinates): ComponentDetail;
  abstract contain(coorImage: Coordinates): boolean;
  abstract isWithin(container: Coordinates[]): boolean;
  abstract proximity(coorImage: Coordinates): Proximity | undefined;
  abstract render(ctx: CanvasRenderingContext2D, transform: ViewportTransform, style: DrawStyle): void;
  abstract svg(style: DrawStyle): string;
  abstract interpolate(other: ComponentDetail, step: number): ComponentDetail[];

  // TODO(hxu): remove exporting to scalabel at some point.
  abstract convertToScalabel(): ScalabelExport;
}

export type ScalabelExport = {
  poly2d?: Poly2Ds[number];
  box2d?: Box2Ds[number];
  rle?: RLEs[number];
};

export type Proximity = {
  info: ProximityDetail;
  dist: number;
};
