import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./App.jsx"
import { Analytics } from "@vercel/analytics/react"   // ✅ import here

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Analytics />   {/* ✅ Add this inside BrowserRouter, after App */}
    </BrowserRouter>
  </StrictMode>
)
