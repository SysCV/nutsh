declare module 'npyjs' {
  import {Tensor} from 'onnxruntime-web';

  export default class npyjs {
    constructor();
    load<T>(url: string): Promise<{data: Tensor.DataTypeMap[T]; shape: number[]; dtype: keyof Tensor.DataTypeMap}>;
  }
}
