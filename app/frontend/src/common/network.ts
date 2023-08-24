import {ApiError} from 'openapi/nutsh';

export function checkBadRequest(error: unknown) {
  if (error instanceof ApiError && 'error_code' in error.body) {
    return error.body['error_code'];
  } else {
    return 'unknown';
  }
}
