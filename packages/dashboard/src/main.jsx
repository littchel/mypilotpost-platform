import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import PublicApproval from "./pages/PublicApproval.jsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandProvider } from "./contexts/BrandContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { ErrorBoundary } from "./ErrorBoundary.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <OnboardingProvider>
            <Routes>
              <Route path="/public/approval/:contentId" element={<PublicApproval />} />
              <Route path="/login" element={<App />} />
              <Route path="/register" element={<App />} />
              <Route path="/onboarding" element={<App />} />
              <Route path="/dashboard" element={<App />} />
              <Route path="/*" element={<App />} />
            </Routes>
          </OnboardingProvider>
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
