// --- 1. PATCH DE SEGURIDAD GLOBAL CONTRA OBJECT.VALUES(NULL/UNDEFINED) ---
const originalObjectValues = Object.values;
Object.values = function (obj: any) {
  if (obj === null || obj === undefined) {
    return [];
  }
  return originalObjectValues(obj);
};
// -------------------------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Unregister Service Worker en desarrollo/producción temporalmente para des-cachear versiones viejas
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
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