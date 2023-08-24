import {FC, useCallback, useContext} from 'react';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import intl from 'react-intl-universal';
import {Spin, App as AntApp} from 'antd';
import {QueryClient, QueryClientProvider, QueryCache, MutationCache} from '@tanstack/react-query';
import {enableMapSet} from 'immer';
import {HotkeysProvider} from 'react-hotkeys-hook';

import {routePath} from 'common/route';
import {ConfigContext, NutshClientContext} from 'common/context';
import {ApiError} from 'openapi/nutsh';

import ProjectList from 'page/project/List';
import ProjectDetail from 'page/project/Detail';
import AnnotatePanel from 'page/annotate/Panel';
import {useGetConfig} from 'state/server/app';

enableMapSet();

const AppRouter: FC = () => {
  // config
  const client = useContext(NutshClientContext);
  const {isFetching: isGettingConfig, data: configResp} = useGetConfig(client);

  return configResp ? (
    <ConfigContext.Provider value={configResp.config}>
      <Routes>
        <Route path={routePath('/projects')} element={<ProjectList />} />
        <Route path={routePath('/project/:projectId')} element={<ProjectDetail />} />
        <Route path={routePath('/video/:videoId')} element={<AnnotatePanel />} />
        <Route path="*" element={<Navigate to={routePath('/projects')} replace />} />
      </Routes>
    </ConfigContext.Provider>
  ) : (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'black',
      }}
    >
      <Spin spinning={isGettingConfig} />
    </div>
  );
};

function App(): JSX.Element {
  const {message} = AntApp.useApp();

  // global query client
  const onError = useCallback(
    (error: unknown) => {
      let id = 'error.unknown';
      if (error instanceof ApiError) {
        if (error.status === 400 || error.status === 409) {
          return;
        }
        if (error.status === 404) {
          id = 'error.not_found';
        }
      }
      message.error(intl.get(id));
    },
    [message]
  );

  const queryClient = new QueryClient({
    queryCache: new QueryCache({onError}),
    mutationCache: new MutationCache({onError}),
    defaultOptions: {
      queries: {
        // disable auto-refetch like on window focus.
        staleTime: Infinity,

        // disable retry.
        retry: false,
      },
    },
  });

  return (
    <HotkeysProvider initiallyActiveScopes={['app']}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRouter />
        </Router>
      </QueryClientProvider>
    </HotkeysProvider>
  );
}

export default App;
