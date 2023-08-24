import {ComponentDetail} from 'type/annotation';
import {newComponentAdapter} from './adapter';
import {DrawStyle} from './constant';

export type StyledComponents = {
  style: DrawStyle;
  components: ComponentDetail[];
};

export function createComponentSVG(settings: StyledComponents[], canvasSize: [number, number]): string {
  const [w, h] = canvasSize;
  const elements = settings
    .map(({components, style}) =>
      components.map(component => {
        const adapter = newComponentAdapter(component);
        return adapter.svg(style);
      })
    )
    .flat();
  const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
        ${elements.join('\n')}
      </svg>
    `;

  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  return url;
}
