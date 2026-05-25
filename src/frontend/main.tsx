import React from "react";
import { createRoot } from "react-dom/client";

import { FrontendApp } from "./App.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <FrontendApp />
  </React.StrictMode>,
);
