import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "./state/AppContext";
import { PublicLayout } from "./layouts/PublicLayout";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import { AssetsPage } from "./pages/AssetsPage";
import { AssetDetailPage } from "./pages/AssetDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { BookingVerifyPage } from "./pages/BookingVerifyPage";
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
    return (_jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(PublicLayout, {}), children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/assets", replace: true }) }), _jsx(Route, { path: "/assets", element: _jsx(AssetsPage, {}) }), _jsx(Route, { path: "/assets/:assetId", element: _jsx(AssetDetailPage, {}) }), _jsx(Route, { path: "/q/:token", element: _jsx(AssetDetailPage, {}) })] }), _jsx(Route, { path: "/app/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/bookings/verify/:token", element: _jsx(BookingVerifyPage, {}) }), _jsxs(Route, { path: "/app", element: _jsx(WorkspaceLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(WorkspaceDashboardPage, {}) }), _jsx(Route, { path: "assets", element: _jsx(WorkspaceAssetsPage, {}) }), _jsx(Route, { path: "bookings", element: _jsx(WorkspaceBookingsPage, {}) }), _jsx(Route, { path: "qr", element: _jsx(WorkspaceQrPage, {}) }), _jsx(Route, { path: "profile", element: _jsx(ProfilePage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/assets", replace: true }) })] }));
}
export function App() {
    return (_jsx(AppProvider, { children: _jsx(BrowserRouter, { children: _jsx(AppRoutes, {}) }) }));
}
