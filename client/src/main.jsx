import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./globals.css";
import { BrowserRouter } from "react-router-dom";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "Root element not found. Make sure there is a div with id='root' in your HTML."
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register service worker for PWA install and offline support (production only)
const enableSwInDev = String(import.meta?.env?.VITE_ENABLE_SW_DEV || "false").toLowerCase() === "true";
if ((import.meta?.env?.PROD || enableSwInDev) && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // eslint-disable-next-line no-console
        console.info("Service worker registered:", reg?.scope || "/");
      })
      .catch((err) => {
        console.error("Service worker registration failed:", err);
      });
  });
}
