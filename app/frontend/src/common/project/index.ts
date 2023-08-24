import {Annotation} from 'type/annotation';

export type VideoAnnotation = {
  video: {name: string};
  frameUrls: string[];
  annotation?: Annotation;
};
