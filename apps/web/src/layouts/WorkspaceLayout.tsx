import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAppState } from "../state/AppContext";

export function WorkspaceLayout() {
  const { session, signOut, ownerBookings } = useAppState();

  if (!session) {
    return <Navigate to="/app/login" replace />;
  }

  const pendingCount = ownerBookings.filter((b) => b.status === "pending").length;

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar">
        <div className="sidebar-logo">scan<span>Ya</span></div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}>
            Dashboard
          </NavLink>
          <NavLink to="/app/assets" className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}>
            My Assets
          </NavLink>
          <NavLink to="/app/bookings" className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}>
            Bookings
            {pendingCount > 0 && <span className="sidebar-badge">{pendingCount}</span>}
          </NavLink>
          <NavLink to="/app/qr" className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link--active" : ""}`}>
            QR Codes
          </NavLink>
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-user-name">{session.user.name}</div>
          <div className="sidebar-user-role">Asset Owner</div>
          <button className="sidebar-signout" onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <div className="workspace-main">
        <Outlet />
      </div>

      <nav className="workspace-bottom-tabs">
        <NavLink to="/app" end className={({ isActive }) => `tab-link ${isActive ? "tab-link--active" : ""}`}>
          <span className="tab-icon">&#8962;</span>Home
        </NavLink>
        <NavLink to="/app/assets" className={({ isActive }) => `tab-link ${isActive ? "tab-link--active" : ""}`}>
          <span className="tab-icon">&#9634;</span>Assets
        </NavLink>
        <NavLink to="/app/bookings" className={({ isActive }) => `tab-link ${isActive ? "tab-link--active" : ""}`}>
          <span className="tab-icon">&#128197;</span>Bookings
          {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
        </NavLink>
        <NavLink to="/app/qr" className={({ isActive }) => `tab-link ${isActive ? "tab-link--active" : ""}`}>
          <span className="tab-icon">&#9641;</span>QR
        </NavLink>
        <NavLink to="/app/profile" className={({ isActive }) => `tab-link ${isActive ? "tab-link--active" : ""}`}>
          <span className="tab-icon">&#9787;</span>Profile
        </NavLink>
      </nav>
    </div>
  );
}
