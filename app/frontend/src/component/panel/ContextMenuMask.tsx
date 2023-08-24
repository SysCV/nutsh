/** @jsxImportSource @emotion/react */

import {FC, CSSProperties, useCallback} from 'react';
import intl from 'react-intl-universal';
import {Dropdown, DropdownProps, App, Space, Tag, MenuProps} from 'antd';
import {ExclamationCircleOutlined} from '@ant-design/icons';
import {css} from '@emotion/react';
import {getComponent, useStore as useAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {ComponentId, EntityId, PolychainComponent} from 'type/annotation';

import {Action, useComponentActions, useEntityActions} from './menu/common';
import {useActions as usePolychainActions} from './menu/polychain';

export const ContextMenuMask: FC<{style?: CSSProperties}> = ({style}) => {
  const contextMenuClient = useRenderStore(s => s.mouse.contextMenuClient);
  const setContextMenuClient = useRenderStore(s => s.mouse.setContextMenuClient);
  if (!contextMenuClient) return null;

  return (
    <div
      style={style}
      onClick={() => setContextMenuClient(undefined)}
      onContextMenu={e => e.preventDefault()}
      // temporarily disable keyboard events
      tabIndex={0}
      css={css`
        &:focus {
          outline: none;
        }
      `}
      ref={ref => ref?.focus()}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.code === 'Escape') {
          setContextMenuClient(undefined);
        }
      }}
    >
      <ContextMenuDropdown
        x={contextMenuClient[0]}
        y={contextMenuClient[1]}
        onFinish={() => setContextMenuClient(undefined)}
      />
    </div>
  );
};

type ActionDropdownProps = DropdownProps & {
  actions: Action[];
  x: number;
  y: number;
  onFinish: () => void;
};

type MenuItemProps = NonNullable<MenuProps['items']>;

const ActionDropdown: FC<ActionDropdownProps> = ({actions, x, y, onFinish, ...dropdownProps}) => {
  const {modal} = App.useApp();

  function actionToMenuItem(action: Action): MenuItemProps[0] {
    const {title, hotkey, fn, warning, disableReason, children} = action;

    if (title === '') {
      return {
        type: 'divider',
      };
    }
    if (children && children.length > 0) {
      return {
        key: title,
        type: 'group',
        label: title,
        children: children.map(actionToMenuItem),
      };
    }

    const onOk = () => {
      fn?.();
      onFinish();
    };

    return {
      key: title,
      label: hotkey ? (
        <Space>
          {title}
          <Tag color="warning">{hotkey}</Tag>
        </Space>
      ) : (
        title
      ),
      disabled: !!disableReason,
      title: disableReason,
      onClick: warning
        ? () => {
            modal.confirm({
              title: intl.get('are_you_sure'),
              content: warning,
              icon: <ExclamationCircleOutlined />,
              okType: 'danger',
              onOk,
            });
          }
        : onOk,
    };
  }
  const items: MenuItemProps = actions.map(actionToMenuItem);

  if (items.length === 0) {
    setTimeout(onFinish, 1);
    return <></>;
  }

  return (
    <Dropdown open={true} menu={{items}} {...dropdownProps}>
      <div
        style={{
          position: 'fixed',
          left: x,
          top: y,
          width: 1,
          height: 1,
        }}
      />
    </Dropdown>
  );
};

type Props = Omit<ActionDropdownProps, 'actions'>;

const ContextMenuDropdown: FC<Props> = props => {
  const sidx = useRenderStore(s => s.sliceIndex);
  const eid = useRenderStore(s => s.mouse.hover?.entityId);
  const cid = useRenderStore(s => s.mouse.hover?.componentId);
  const c = useAnnoStore(
    useCallback(
      s => {
        if (!eid || !cid) return undefined;
        return getComponent(s, sidx, eid, cid);
      },
      [sidx, cid, eid]
    )
  );

  if (eid && cid) {
    // component-related dropdown
    if (c?.type === 'polychain') {
      return <PolyDropdown eid={eid} cid={cid} c={c} {...props} />;
    }
    return <ComponentDropdown eid={eid} cid={cid} {...props} />;
  }

  // entity-related dropdown
  return <EntityDropdown {...props} />;
};

const EntityDropdown: FC<Props> = ({...props}) => {
  const actions = useEntityActions();
  return <ActionDropdown actions={actions} {...props} />;
};

type ComponentDropdownProps = {
  eid: EntityId;
  cid: ComponentId;
};

const PolyDropdown: FC<Props & ComponentDropdownProps & {c: PolychainComponent}> = ({eid, cid, c, ...props}) => {
  const ps = usePolychainActions(c);
  const cs = useComponentActions(eid, cid);
  const actions: Action[] = ps.length > 0 ? [...ps, {title: '' /* a divider */}, ...cs] : cs;
  return <ActionDropdown actions={actions} {...props} />;
};

const ComponentDropdown: FC<Props & ComponentDropdownProps> = ({eid, cid, ...props}) => {
  const actions = useComponentActions(eid, cid);
  return <ActionDropdown actions={actions} {...props} />;
};
