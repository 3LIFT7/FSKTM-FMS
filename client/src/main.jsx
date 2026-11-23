import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import en_GB from 'antd/locale/en_GB';
import App from './App.jsx';
import { theme } from './theme';
import './index.css';

// Global fetch interceptor: Include httpOnly cookie credentials for all /api requests
const originalFetch = window.fetch;
window.fetch = function (resource, init = {}) {
  const url = typeof resource === 'string' ? resource : resource?.url || '';

  if (url.startsWith('/api') || url.includes('/api/')) {
    init = {
      ...init,
      credentials: init.credentials || 'include',
    };
  }

  return originalFetch.call(this, resource, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={en_GB}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
