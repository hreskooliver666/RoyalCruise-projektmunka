// Ez a fájl indítja el a React alkalmazást, és felcsatolja a gyökérkomponenst a DOM root elemére.
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import CabinsProvider from "./contexts/CabinsProvider.jsx";
import AuthProvider from "./auth/AuthProvider.jsx";

// Itt indítjuk el a React alkalmazást a közös útvonalkezelővel és szolgáltatókkal együtt.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CabinsProvider>
          <App />
        </CabinsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
