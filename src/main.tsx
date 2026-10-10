import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './i18n';
import { initPwa } from './pwa';
import { FeedbackProvider } from './components/Feedback';

// Before render, so Chrome's early install event isn't missed.
initPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </LanguageProvider>
  </StrictMode>,
);
