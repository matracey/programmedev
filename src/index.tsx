/**
 * QQI Programme Design Studio - React entry point.
 * Initializes the application and renders the root React component.
 * @module index
 */

import React from "react";
import { createRoot } from "react-dom/client";

// Import Bootstrap and styles
import * as bootstrap from "bootstrap";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/bold";
import "./style.css";

// Import state management
import { load } from "./state/store.js";

// Import App component
import { App } from "./App";

// Store bootstrap reference to avoid tree-shaking
(window as Window & { bootstrap?: typeof bootstrap }).bootstrap = bootstrap;

/**
 * Initialize theme based on localStorage or system preference.
 */
function initTheme(): void {
  const stored = localStorage.getItem("nci_pds_theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-bs-theme", initial);
}

/**
 * Initialize and render the application.
 */
function init(): void {
  // Load state from localStorage
  load();

  // Initialize theme
  initTheme();

  // Get root element
  const rootElement = document.getElementById("app");
  if (!rootElement) {
    console.error("Root element #app not found");
    return;
  }

  // Create React root and render
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Store reference for legacy compatibility
  (window as Window & { __pds_state?: object }).__pds_state = {
    get programme() {
      // Access via store module
      return (window as any).__pds_store?.programme;
    },
  };
}

// Start the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
