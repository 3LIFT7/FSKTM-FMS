import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import en_GB from 'antd/locale/en_GB';
import App from './App.jsx';
import { theme } from './theme';
import './index.css';

// Global fetch interceptor: Attach stored JWT Bearer token & include credentials for all /api requests
const originalFetch = window.fetch;
window.fetch = function (resource, init = {}) {
  const url = typeof resource === 'string' ? resource : resource?.url || '';

  if (url.startsWith('/api') || url.includes('/api/')) {
    const token = localStorage.getItem('fsktm_auth_token');
    const headers = new Headers(init.headers || {});

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    init = {
      ...init,
      credentials: init.credentials || 'include',
      headers,
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
