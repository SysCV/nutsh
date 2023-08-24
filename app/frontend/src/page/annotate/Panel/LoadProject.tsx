import {FC, useContext, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {useGetProject} from 'state/server/project';
import {useStore as useRenderStore} from 'state/annotate/render';
import {NutshClientContext} from 'common/context';
import {Testing} from 'component/Testing';
import PageLayout from 'page/Layout';
import type {Video} from 'openapi/nutsh';
import {CategoryAbbreviation} from 'component/panel/entity/display';
import {collectCategoryLeafs} from 'component/resource/MutateProject';
import {PanelLoaded} from './Loaded';
import {Alert} from 'antd';

export const PanelLoadProject: FC<{video: Video}> = ({video}) => {
  const client = useContext(NutshClientContext);

  // server state
  const {isFetching, data} = useGetProject(client, video.project_id);

  // local state
  const [ready, setReady] = useState<boolean>(false);
  useEffect(() => {
    if (!data) return;

    // Register category colors
    const cats = data.projectSpec.categories;
    const allValues: string[] = [];
    cats?.forEach(cat => {
      const entries = collectCategoryLeafs(cat);
      const values = entries.map(e => e.name);
      allValues.push(...values);
    });
    CategoryAbbreviation.set(allValues);

    setReady(true);
  }, [data]);

  return (
    <PageLayout loading={isFetching} contentPadding={0}>
      {data && ready && <PanelLoaded video={video} project={data.project} projectSpec={data.projectSpec} />}
      <SyncErrorMask />
      {process.env.REACT_APP_DEV === 'true' && <Testing />}
    </PageLayout>
  );
};

const SyncErrorMask: FC = () => {
  const syncError = useRenderStore(s => s.syncError);
  return syncError ? (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.8)',
      }}
    >
      <Alert showIcon={true} type="error" message={intl.get('error.sync')} description={intl.get(syncError)} />
    </div>
  ) : null;
};
