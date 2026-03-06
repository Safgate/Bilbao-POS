import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { CustomerDisplay } from './pages/CustomerDisplay.tsx';
import './index.css';

const view = new URLSearchParams(window.location.search).get('view');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {view === 'customer' ? <CustomerDisplay /> : <App />}
  </StrictMode>,
);
