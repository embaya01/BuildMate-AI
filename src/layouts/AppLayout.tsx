import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', short: 'DB' },
  { to: '/projects', label: 'Projects', short: 'PR' },
  { to: '/estimates', label: 'Estimates', short: 'ES' },
  { to: '/materials', label: 'Materials', short: 'MT' },
  { to: '/labor', label: 'Labor', short: 'LB' },
  { to: '/subcontractors', label: 'Subcontractors', short: 'SC' },
  { to: '/settings', label: 'Settings', short: 'ST' },
];

const getLinkClass = (isActive: boolean) =>
  isActive ? 'sidebar__link sidebar__link--active' : 'sidebar__link';

export const AppLayout = () => {
  const { user, signOut, loading } = useAuth();
  const greetingSuffix = user?.displayName ? `, ${user.displayName}` : '';
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="fullscreen-state">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleCloseMenu = () => setMenuOpen(false);

  return (
    <div className={`scopesmart-shell${menuOpen ? ' scopesmart-shell--menu' : ''}`}>
      <aside className="shell-sidebar" data-state={menuOpen ? 'open' : 'closed'}>
        <div className="sidebar__brand">
          <div className="sidebar__logo" aria-hidden="true">
            <span><img src='../../assets/react.svg' /></span>
          </div>
          <div>
            <p className="sidebar__title">BuildMate AI</p>
            <p className="sidebar__subtitle">Estimator Suite</p>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => getLinkClass(isActive)}
              onClick={handleCloseMenu}
            >
              <span className="sidebar__icon" aria-hidden="true">
                {item.short}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button
            className="sidebar__signout"
            type="button"
            onClick={() => {
              handleCloseMenu();
              signOut();
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="shell-overlay"
          aria-label="Close navigation"
          onClick={handleCloseMenu}
        />
      ) : null}

      <div className="shell-main">
        <header className="shell-topbar">
          <button
            type="button"
            className="topbar__menu"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="topbar__headings">
            <h1 className="topbar__title">Welcome back{greetingSuffix}.</h1>
            <p className="topbar__subtitle">
              Stay on top of your construction projects with ScopeSmart.
            </p>
          </div>
          <Link className="topbar__user-link" to="/profile" aria-label="View profile">
            <div className="topbar__user">
              <div className="topbar__avatar" aria-hidden="true">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" />
                ) : (
                  user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'S'
                )}
              </div>
              <div className="topbar__identity">
                <span className="topbar__name">{user.displayName ?? 'ScopeSmart Pro'}</span>
                <span className="topbar__email">{user.email}</span>
              </div>
            </div>
          </Link>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
