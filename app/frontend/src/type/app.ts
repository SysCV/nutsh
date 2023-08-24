import type {CreateProjectReq} from 'openapi/nutsh';

export type ProjectForm = Omit<CreateProjectReq, 'spec_json'>;
