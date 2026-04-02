import { Link, Outlet } from "react-router-dom";

export function PublicLayout() {
  return (
    <div>
      <header className="public-header">
        <Link to="/assets" className="brand-logo">
          scan<span>Ya</span>
        </Link>
        <div className="header-actions">
          <Link to="/assets" className="header-link">
            Browse Assets
          </Link>
          <Link to="/app/login" className="header-link">
            Owner Login
          </Link>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
