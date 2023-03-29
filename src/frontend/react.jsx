import * as React from "react";
import * as ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";

import App from "./app.jsx";

function render() {
  createRoot(document.getElementById("root")).render(<App />);
}

render();
