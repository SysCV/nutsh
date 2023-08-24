import {FC, useContext, useState} from 'react';
import intl from 'react-intl-universal';
import {Link} from 'react-router-dom';
import {Dropdown, Modal, Button, Layout, Spin, Descriptions, Alert, Tag, Space} from 'antd';
import {InfoCircleOutlined, QuestionCircleOutlined, MenuOutlined} from '@ant-design/icons';

import {useGetMetadata} from 'state/server/app';

import {ConfigContext, NutshClientContext} from 'common/context';
import {routePath} from 'common/route';
import {UI} from 'common/constant';

const {Content, Header} = Layout;

export interface Prop {
  children?: React.ReactNode;
  loading?: boolean;
  contentPadding?: number;
}

const PageLayout: FC<Prop> = ({loading, contentPadding, children}) => {
  const client = useContext(NutshClientContext);

  // server state
  const {isFetching: isGettingMetadata, data: metadata} = useGetMetadata(client);

  // local
  const [showMetadata, setShowMetadata] = useState<boolean>(false);

  // config
  const config = useContext(ConfigContext);

  return (
    <Layout style={{width: '100vw', minHeight: '100vh', overflow: 'hidden'}}>
      {process.env.REACT_APP_DEV === 'true' && process.env.REACT_APP_WARN_DEV !== 'false' && (
        <Alert
          message="Running in develop mode"
          banner={true}
          style={{position: 'fixed', top: 0, width: '100vw', zIndex: 999}}
          type="error"
          closable={true}
        />
      )}

      <Header
        style={{
          paddingLeft: UI.spacing,
          paddingRight: UI.spacing,
          height: UI.navbarHeight,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#1f1f1f',
        }}
      >
        <Link to={routePath()}>
          <img src={`${process.env.PUBLIC_URL}/banner.svg`} style={{height: 36}} alt="banner" />
        </Link>
        <Space>
          {config.readonly && <Tag color="warning">{intl.get('readonly_mode')}</Tag>}
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'help',
                  label: intl.get('help'),
                  icon: <QuestionCircleOutlined />,
                  onClick: () => (window.location.href = '/docs'),
                },
                {
                  key: 'about',
                  label: intl.get('about'),
                  icon: <InfoCircleOutlined />,
                  onClick: () => setShowMetadata(true),
                },
              ],
            }}
            placement="bottomLeft"
          >
            <Button type="text" icon={<MenuOutlined />} />
          </Dropdown>
        </Space>
      </Header>
      <Content style={{padding: contentPadding ?? UI.spacing, position: 'relative'}}>
        {children}
        {loading && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spin />
          </div>
        )}
      </Content>

      <Modal
        open={showMetadata}
        title={intl.get('product_information')}
        cancelButtonProps={{hidden: true}}
        okButtonProps={{hidden: true}}
        onOk={() => setShowMetadata(false)}
        onCancel={() => setShowMetadata(false)}
      >
        <div style={{textAlign: 'center', padding: 32}}>
          <img src={`${process.env.PUBLIC_URL}/banner.svg`} style={{height: 48}} alt="banner" />
        </div>
        <Spin spinning={isGettingMetadata}>
          <Descriptions column={1}>
            <Descriptions.Item label={intl.get('version')}>{metadata?.version}</Descriptions.Item>
            <Descriptions.Item label={intl.get('commit')}>{metadata?.commit_identifier}</Descriptions.Item>
            <Descriptions.Item label={intl.get('time')} style={{paddingBottom: 0}}>
              {metadata?.commit_time}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Modal>
    </Layout>
  );
};

export default PageLayout;
