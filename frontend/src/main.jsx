import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { GlobalStateProvider } from '/src/context/GlobalState.jsx'; // Changed path

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalStateProvider> {/* Wrap App with the provider */}
        <App />
      </GlobalStateProvider>
    </BrowserRouter>
  </StrictMode>
);
