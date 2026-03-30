import React from 'react';
import {
  NavLink,
  Navigate,
  Route,
  Routes
} from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import {
  isStaffRole,
  normalizeText,
  roleDescriptions,
  roleLabels,
  StatusPill,
  titleCase
} from './kit.jsx';
import {
  workspaceNavItems,
  workspaceRouteDefinitions
} from './routeConfig.jsx';

function LoginView() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    await login(email, password);
  };

  return (
    <section className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Web-v2 rollout</p>
        <h1>levels+lines Control Room</h1>
        <p className="lead">
          One authenticated shell for client, employee, manager and admin routes, ready to keep sharing the same
          `api/v2` contract with the future mobile app.
        </p>
        <form onSubmit={onSubmit} className="form">
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
}

function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const role = normalizeText(user?.role || 'client');

  return (
    <div className="layout-app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Rollout shell</p>
          <h1>{roleLabels[role] || 'Workspace'}</h1>
          <p>{roleDescriptions[role]}</p>
        </div>

        <div className="sidebar-account">
          <strong>{user?.name || user?.email}</strong>
          <span>{user?.email}</span>
          <StatusPill tone="accent">{titleCase(role)}</StatusPill>
        </div>

        <nav className="nav">
          {workspaceNavItems.map((item) => {
            if (item.staffOnly && !isStaffRole(role)) return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`.trim()}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          {workspaceRouteDefinitions.map((route) => {
            const PageComponent = route.component;
            const isAllowed = !route.staffOnly || isStaffRole(role);
            return (
              <Route
                key={route.path}
                path={route.path}
                element={isAllowed ? <PageComponent /> : <Navigate to="/overview" replace />}
              />
            );
          })}
        </Routes>
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="state">Loading session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export { LoginView, WorkspaceLayout, ProtectedRoute };
