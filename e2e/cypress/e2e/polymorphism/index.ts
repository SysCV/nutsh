import {ComponentAdapter} from './base';
import {Polychain} from './polychain';
import {Rectangle} from './rectangle';

import {ComponentDetail} from '../../../../app/frontend/src/type/annotation';

export function newComponentAdapter(component: ComponentDetail): ComponentAdapter {
  switch (component.type) {
    case 'polychain':
      return new Polychain(component);
    case 'rectangle':
      return new Rectangle(component);
    case 'mask':
      throw new Error('unimplemented');
  }
}
