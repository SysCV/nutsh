import {FC, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {Drawer, Button} from 'antd';

import {useStore as useRenderStore} from 'state/annotate/render';
import {EntityDisplayId} from 'component/panel/entity/display';
import {EntityForm} from 'component/panel/entity/Form';

import type {ProjectSpec} from 'type/project_spec';

export const EntityEditDrawer: FC<{projectSpec: ProjectSpec}> = ({projectSpec}) => {
  // annotate state
  const isEditing = useRenderStore(s => s.editingEntityId !== undefined);
  const editingEntityId = useRenderStore(s => s.editingEntityId);
  const setEditingEntityId = useRenderStore(s => s.setEditingEntityId);
  const setSelectedEntityIds = useRenderStore(s => s.select.set);

  // Introduce a local state to control open status and
  // `setEditingEntityId(undefined)` in the `afterOpenChange` callback to create
  // a smooth UI experience. Otherwise, the `EntityForm` will suddenly disappear
  // when closing.
  const [open, setOpen] = useState<boolean>(isEditing);
  useEffect(() => {
    setOpen(isEditing);
  }, [isEditing]);

  return (
    <Drawer
      title={editingEntityId && intl.get('edit_entity', {id: EntityDisplayId.get(editingEntityId)})}
      placement="right"
      getContainer={false}
      width="100%"
      open={open}
      closable={false}
      afterOpenChange={isOpen => {
        if (isOpen) {
          // Select the editing entity AFTER the drawer is shown rather than
          // before to avoid lagging upon showing the drawer, because focusing
          // to an entity might be a heavy action.
          if (editingEntityId !== undefined) {
            setSelectedEntityIds(editingEntityId);
          }
        } else {
          setEditingEntityId(undefined);
        }
      }}
    >
      {editingEntityId && <EntityForm entityId={editingEntityId} projectSpec={projectSpec} />}
      <Button onClick={() => setOpen(false)} type="primary">
        {intl.get('close')}
      </Button>
    </Drawer>
  );
};
