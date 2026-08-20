import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {GlobalFeedbackProvider} from './components/GlobalFeedbackSystem';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalFeedbackProvider>
      <App />
    </GlobalFeedbackProvider>
  </StrictMode>,
);
