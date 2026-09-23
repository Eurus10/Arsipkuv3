import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runRaporMigrationDryRun } from './utils/runRaporMigrationDryRun';
import { runLegacyTpInventoryRunner } from './utils/runLegacyTpInventoryRunner';

// Dev-only / preview exposure for Browser Console audit
if (typeof window !== 'undefined') {
  (window as any).__runRaporMigrationDryRun = runRaporMigrationDryRun;
  (window as any).__runLegacyTpInventory = runLegacyTpInventoryRunner;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

