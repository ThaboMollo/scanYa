import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, useAppState } from "./state/AppContext";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import { HomePage } from "./pages/HomePage";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { WorkspaceDashboardPage } from "./pages/WorkspaceDashboardPage";
import { WorkspaceAssetsPage } from "./pages/WorkspaceAssetsPage";
import { WorkspaceBookingsPage } from "./pages/WorkspaceBookingsPage";
import { WorkspaceQrPage } from "./pages/WorkspaceQrPage";
import { ProfilePage } from "./pages/ProfilePage";
import "./styles/global.css";
import "./styles/public.css";
import "./styles/workspace.css";
import "./styles/calendar.css";

function DefaultWorkspaceRoute() {
  const { session } = useAppState();

  if (session?.user.role === "event_organizer") {
    return <Navigate to="/app/events" replace />;
  }

  return <Navigate to="/app" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:assetId" element={<AssetDetailPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/q/:token" element={<AssetDetailPage qrMode />} />
      </Route>

      <Route path="/app" element={<WorkspaceLayout />}>
        <Route index element={<WorkspaceDashboardPage />} />
        <Route path="assets" element={<WorkspaceAssetsPage />} />
        <Route path="bookings" element={<WorkspaceBookingsPage />} />
        <Route path="qr" element={<WorkspaceQrPage />} />
        <Route path="events" element={<EventDetailPage workspaceMode />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="/workspace" element={<DefaultWorkspaceRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
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
