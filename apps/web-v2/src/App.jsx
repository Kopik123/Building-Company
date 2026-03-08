import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { v2Api } from './lib/api';

const roleLabels = {
  client: 'Client Workspace',
  employee: 'Employee Workspace',
  manager: 'Manager Workspace',
  admin: 'Admin Workspace'
};

const isStaffRole = (role) => ['employee', 'manager', 'admin'].includes(String(role || '').toLowerCase());

function useResource(loader, deps = []) {
  const [state, setState] = React.useState({ loading: true, error: '', data: [] });

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      try {
        const data = await loader();
        if (active) setState({ loading: false, error: '', data: Array.isArray(data) ? data : [] });
      } catch (error) {
        if (active) setState({ loading: false, error: error.message || 'Could not load data', data: [] });
      }
    };
    run();
    return () => {
      active = false;
    };
  }, deps);

  return state;
}

function LoginView() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    await login(email, password);
  };

  return (
    <section className="card auth-card">
      <h1>levels+lines Control Panel v2</h1>
      <p>Single app for client, employee, manager and admin roles.</p>
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

function PanelList({ title, loading, error, items, renderItem }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {loading ? <p className="muted">Loading...</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && !items.length ? <p className="muted">No records.</p> : null}
      <div className="list">
        {items.map((item, index) => (
          <article key={item.id || `${title}-${index}`} className="item">
            {renderItem(item)}
          </article>
        ))}
      </div>
    </section>
  );
}

function AccountPage() {
  const { user } = useAuth();
  const unread = useResource(() => v2Api.getNotificationsUnreadCount(), []);

  return (
    <section className="card">
      <h2>Account</h2>
      <p>
        {user?.name || user?.email} ({user?.role})
      </p>
      <p>Email: {user?.email}</p>
      <p>Unread notifications: {unread.loading ? '...' : unread.data}</p>
    </section>
  );
}

function ProjectsPage() {
  const projects = useResource(() => v2Api.getProjects(), []);
  return (
    <PanelList
      title="Projects"
      loading={projects.loading}
      error={projects.error}
      items={projects.data}
      renderItem={(project) => (
        <>
          <h3>{project.title || 'Untitled project'}</h3>
          <p className="muted">
            {project.status} | {project.location || '-'} | media: {project.imageCount || 0} image /{' '}
            {project.documentCount || 0} docs
          </p>
        </>
      )}
    />
  );
}

function QuotesPage() {
  const quotes = useResource(() => v2Api.getQuotes(), []);
  return (
    <PanelList
      title="Quotes"
      loading={quotes.loading}
      error={quotes.error}
      items={quotes.data}
      renderItem={(quote) => (
        <>
          <h3>{quote.projectType || 'Quote'}</h3>
          <p className="muted">
            {quote.status} | priority {quote.priority} | {quote.location || '-'}
          </p>
          <p>{quote.description || ''}</p>
        </>
      )}
    />
  );
}

function MessagesPage() {
  const threads = useResource(() => v2Api.getThreads(), []);
  return (
    <PanelList
      title="Messages / Threads"
      loading={threads.loading}
      error={threads.error}
      items={threads.data}
      renderItem={(thread) => (
        <>
          <h3>{thread.name || thread.subject || 'Thread'}</h3>
          <p className="muted">Updated: {new Date(thread.updatedAt).toLocaleString('en-GB')}</p>
        </>
      )}
    />
  );
}

function NotificationsPage() {
  const notifications = useResource(() => v2Api.getNotifications(), []);
  return (
    <PanelList
      title="Notifications"
      loading={notifications.loading}
      error={notifications.error}
      items={notifications.data}
      renderItem={(notification) => (
        <>
          <h3>{notification.title}</h3>
          <p className="muted">{notification.type}</p>
          <p>{notification.body}</p>
        </>
      )}
    />
  );
}

function CrmPage() {
  const clients = useResource(() => v2Api.getCrmClients(), []);
  const staff = useResource(() => v2Api.getCrmStaff(), []);
  return (
    <div className="grid-two">
      <PanelList
        title="CRM Clients"
        loading={clients.loading}
        error={clients.error}
        items={clients.data}
        renderItem={(client) => (
          <>
            <h3>{client.name || 'Client'}</h3>
            <p className="muted">{client.email}</p>
            <p>{client.phone || '-'}</p>
          </>
        )}
      />
      <PanelList
        title="Staff"
        loading={staff.loading}
        error={staff.error}
        items={staff.data}
        renderItem={(member) => (
          <>
            <h3>{member.name || 'Staff'}</h3>
            <p className="muted">
              {member.email} | {member.role}
            </p>
          </>
        )}
      />
    </div>
  );
}

function InventoryPage() {
  const services = useResource(() => v2Api.getInventoryServices(), []);
  const materials = useResource(() => v2Api.getInventoryMaterials(), []);
  return (
    <div className="grid-two">
      <PanelList
        title="Services"
        loading={services.loading}
        error={services.error}
        items={services.data}
        renderItem={(service) => (
          <>
            <h3>{service.title}</h3>
            <p className="muted">
              {service.category} | {service.slug}
            </p>
          </>
        )}
      />
      <PanelList
        title="Materials"
        loading={materials.loading}
        error={materials.error}
        items={materials.data}
        renderItem={(material) => (
          <>
            <h3>{material.name}</h3>
            <p className="muted">
              SKU: {material.sku || '-'} | stock {material.stockQty}/{material.minStockQty}
            </p>
          </>
        )}
      />
    </div>
  );
}

function ServiceCataloguePage() {
  const services = useResource(() => v2Api.getPublicServices(), []);
  return (
    <PanelList
      title="Service Catalogue"
      loading={services.loading}
      error={services.error}
      items={services.data}
      renderItem={(service) => (
        <>
          <h3>{service.title}</h3>
          <p className="muted">{service.shortDescription || '-'}</p>
        </>
      )}
    />
  );
}

function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const role = String(user?.role || 'client').toLowerCase();

  return (
    <div className="layout-app">
      <aside className="sidebar">
        <h1>{roleLabels[role] || 'Workspace'}</h1>
        <p>{user?.name || user?.email}</p>
        <nav className="nav">
          <Link to="/account">Account</Link>
          <Link to="/projects">Projects</Link>
          <Link to="/quotes">Quotes</Link>
          <Link to="/messages">Messages</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/services-catalogue">Services</Link>
          {isStaffRole(role) ? <Link to="/crm">CRM</Link> : null}
          {isStaffRole(role) ? <Link to="/inventory">Inventory</Link> : null}
        </nav>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/services-catalogue" element={<ServiceCataloguePage />} />
          <Route path="/crm" element={isStaffRole(role) ? <CrmPage /> : <Navigate to="/projects" replace />} />
          <Route path="/inventory" element={isStaffRole(role) ? <InventoryPage /> : <Navigate to="/projects" replace />} />
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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
