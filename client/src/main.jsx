import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import "react-bootstrap";
import "./style/global.css";
// Import fonts from Google
import { motion } from 'framer-motion';
import { IconContext } from 'react-icons';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path = "/*" element = {<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
