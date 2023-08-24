import React from 'react';
import ReactDOM from 'react-dom/client';
import intl from 'react-intl-universal';
import {ConfigProvider, theme, App as AntApp} from 'antd';

import App from 'App';

import 'antd/dist/reset.css';
import './index.css';

const {darkAlgorithm} = theme;

const localeCode = process.env.REACT_APP_LANG ?? 'en-US';
import(`locale/${localeCode}.json`).then(locale => {
  import('antd/es/locale/' + localeCode.replace('-', '_') + '.js').then(antdLocale => {
    intl.init({
      currentLocale: localeCode,
      locales: {
        [localeCode]: locale,
      },
    });

    const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
    root.render(
      <React.StrictMode>
        <ConfigProvider
          locale={antdLocale.default}
          theme={{
            algorithm: darkAlgorithm,
            token: {
              // The `--ifm-color-primary-darkest` color of the tint color `#fbc37e`, whose contrast ratings are all
              // `AAA` in dark mode, from https://docusaurus.io/docs/styling-layout#styling-your-site-with-infima.
              colorPrimary: '#f89010',
              colorLink: '#f89010',
            },
          }}
        >
          <AntApp>
            <App />
          </AntApp>
        </ConfigProvider>
      </React.StrictMode>
    );
  });
});
