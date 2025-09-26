// frontend/src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core"; // 1. Importe o Provider
import "@mantine/core/styles.css"; // 2. Importe o CSS base do Mantine

import App from "./App";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    {/* 3. "Abrace" sua aplicação com o MantineProvider */}
    <MantineProvider>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
