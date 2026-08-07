import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Periodically check for a newer build so deployed fixes (new hashed
        // assets, cache-busted shells) become active promptly on installed PWAs.
        window.setInterval(() => void registration.update(), 60 * 60 * 1000);
      })
      .catch(() => {
        /* SW registration is non-critical */
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
