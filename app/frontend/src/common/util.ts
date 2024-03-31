import deepCompare from 'deep-equal';

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function deepEqual<T>(a: T, b: T): boolean {
  return deepCompare(a, b);
}
