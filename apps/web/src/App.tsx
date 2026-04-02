import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { WorkspaceDashboardPage } from "./pages/WorkspaceDashboardPage";
import { WorkspaceAssetsPage } from "./pages/WorkspaceAssetsPage";
import { WorkspaceBookingsPage } from "./pages/WorkspaceBookingsPage";
import { WorkspaceQrPage } from "./pages/WorkspaceQrPage";
import { ProfilePage } from "./pages/ProfilePage";
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Navigate to="/assets" replace />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:assetId" element={<AssetDetailPage />} />
        <Route path="/q/:token" element={<AssetDetailPage />} />
      </Route>

      {/* Login (public, no layout chrome) */}
      <Route path="/app/login" element={<LoginPage />} />

      {/* Workspace routes */}
      <Route path="/app" element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceDashboardPage />} />
        <Route path="assets" element={<WorkspaceAssetsPage />} />
        <Route path="bookings" element={<WorkspaceBookingsPage />} />
        <Route path="qr" element={<WorkspaceQrPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/assets" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
