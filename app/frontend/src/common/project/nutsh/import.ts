import type {ImportProjectReq} from 'openapi/nutsh';
import type {ProjectForm} from 'type/app';
import type {Format} from 'type/serialization';

export async function mustConvert(decoded: Format, form: ProjectForm): Promise<ImportProjectReq> {
  const worker = new Worker(new URL('worker/import.worker.ts', import.meta.url));
  return new Promise<ImportProjectReq>(resolve => {
    worker.onmessage = event => resolve(event.data);
    worker.postMessage({decoded, form});
  });
}
