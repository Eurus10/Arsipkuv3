import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runRaporMigrationDryRun } from './utils/runRaporMigrationDryRun';
import { runLegacyTpInventoryRunner } from './utils/runLegacyTpInventoryRunner';

import ErrorBoundary from './components/common/ErrorBoundary';

// Dev-only / preview exposure for Browser Console audit
if (typeof window !== 'undefined') {
  (window as any).__runRaporMigrationDryRun = runRaporMigrationDryRun;
  (window as any).__runLegacyTpInventory = runLegacyTpInventoryRunner;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

