import {ComponentDetail} from 'type/annotation';
import {ComponentAdapter} from './base';
import {Polychain} from './polychain';
import {Rectangle} from './rectangle';
import {Mask} from './mask';

export function newComponentAdapter(component: ComponentDetail): ComponentAdapter {
  switch (component.type) {
    case 'polychain':
      return new Polychain(component);
    case 'rectangle':
      return new Rectangle(component);
    case 'mask':
      return new Mask(component);
  }
}
