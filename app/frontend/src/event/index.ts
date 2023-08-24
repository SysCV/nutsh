import {createNanoEvents} from 'nanoevents';
import {SegmentationSample} from 'proto/schema/v1/train_pb';

interface Events {
  segmentationSampleCreated: (segmentation: SegmentationSample) => void;
}

export const emitter = createNanoEvents<Events>();
