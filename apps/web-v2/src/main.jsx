import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import { App } from './App';
import './styles.css';

const routerBasename = (() => {
  const baseUrl = String(import.meta.env.BASE_URL || '/').trim();
  if (!baseUrl || baseUrl === '/') return undefined;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
