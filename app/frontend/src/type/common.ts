import * as t from 'io-ts';
import {isLeft} from 'fp-ts/lib/These';
import {PathReporter} from 'io-ts/PathReporter';

export function mustDecodeJsonStr<T>(typ: t.Type<T>, str: string): T {
  const parsed = JSON.parse(str);
  const decoded = typ.decode(parsed);
  if (isLeft(decoded)) {
    throw new Error('decode Json error', {
      cause: PathReporter.report(decoded),
    });
  }
  return decoded.right;
}

export const nonnegativeIntegerString = new t.Type<number, string, unknown>(
  'nonnegativeIntegerString',
  (input): input is number => Number.isInteger(input),
  (input, context) => {
    const n = Number(input);
    if (Number.isNaN(n)) {
      return t.failure(input, context);
    }
    if (n < 0) {
      return t.failure(input, context);
    }
    return t.success(n);
  },
  input => input.toString()
);
