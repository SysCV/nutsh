import {useState} from 'react';
import {useHotkeys, isHotkeyPressed} from 'react-hotkeys-hook';
import {Key} from 'ts-key-enum';

export function useKeyPressed(key: Key | string) {
  const [isPressed, setPressed] = useState(isHotkeyPressed(key));
  useHotkeys(key, e => e.key === key && setPressed(e.type === 'keydown'), {
    keydown: true,
    keyup: true,
  });
  return isPressed;
}
