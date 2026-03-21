import { Link, NavLink, Outlet } from 'react-router-dom';
import { config } from '../config';

export function Layout() {
  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <Link to="/" className="brand">
            <span className="brand-badge">MM</span>
            <div>
              <h1>Survivor Pool</h1>
              <p>Men&apos;s March Madness dashboard</p>
            </div>
          </Link>
        </div>
        <nav className="nav">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/submit">Make Pick</NavLink>
          <NavLink to={`/${config.adminRouteSlug}`}>Admin</NavLink>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
