import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { GlobalStateProvider } from './context/GlobalState.jsx'; // Import the provider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalStateProvider> {/* Wrap App with the provider */}
        <App />
      </GlobalStateProvider>
    </BrowserRouter>
  </StrictMode>
);
