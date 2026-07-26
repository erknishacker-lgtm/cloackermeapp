import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Toaster position="bottom-right" theme="dark" offset={20} />
    <App />
  </React.StrictMode>
);
