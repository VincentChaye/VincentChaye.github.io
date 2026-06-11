import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/config'; // Initialize i18n before app renders
import App from './App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initOffline } from '@/offline/offline.store';

// Initialisation du mode hors ligne (no-op en prod web, actif en natif et en dev)
initOffline().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
