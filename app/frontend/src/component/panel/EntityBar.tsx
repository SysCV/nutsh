import {FC} from 'react';
import intl from 'react-intl-universal';
import {useWindowHeight} from '@react-hook/window-size';
import {Button, Typography, Popover} from 'antd';
import {BarChartOutlined} from '@ant-design/icons';
import {UI} from 'common/constant';
import {EntityList} from 'component/panel/entity/List';
import {EntityEditDrawer} from 'component/panel/entity/EditDrawer';
import type {ProjectSpec} from 'type/project_spec';
import {rightSidebarWidth} from 'component/panel/layout';
import {AnnotationStat} from 'component/panel/AnnotationStat';

const {Title} = Typography;

export type Props = React.ComponentProps<'div'> & {
  projectSpec: ProjectSpec;
};

export const EntityBar: FC<Props> = ({projectSpec, ...baseProps}) => {
  const winHeight = useWindowHeight();
  return (
    <div {...baseProps}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: UI.spacing}}>
        <Title level={5} style={{margin: 0}}>
          {intl.get('entity_list')}
        </Title>
        <Popover content={<AnnotationStat />} trigger="hover" placement="rightTop">
          <Button icon={<BarChartOutlined />} type="text" />
        </Popover>
      </div>
      <EntityList
        width={rightSidebarWidth - 2 * UI.spacing}
        height={winHeight - UI.navbarHeight - 32 /* header */ - 2 * UI.spacing}
        projectSpec={projectSpec}
      />
      <EntityEditDrawer projectSpec={projectSpec} />
    </div>
  );
};
