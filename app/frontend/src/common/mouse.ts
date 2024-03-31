export function relativeMousePosition<T extends HTMLElement>(event: React.MouseEvent<T>, ele: T) {
  const rect = ele.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
