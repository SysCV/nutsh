import {Format} from 'type/serialization';
import {ImportProjectReq} from 'openapi/nutsh';
import {ProjectForm} from 'type/app';
import {mustConvert} from './import';

function respond(message: ImportProjectReq) {
  self.postMessage(message);
}

self.onmessage = (e: MessageEvent<{decoded: Format; form: ProjectForm}>) => {
  const {decoded, form} = e.data;
  const req = mustConvert(decoded, form);
  respond(req);
};

export {};
