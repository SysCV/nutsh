import deepCompare from 'deep-equal';

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function deepEqual<T>(a: T, b: T): boolean {
  return deepCompare(a, b);
}

export function relativeMousePosition<T extends HTMLElement>(event: React.MouseEvent<T>, ele: T) {
  const rect = ele.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
