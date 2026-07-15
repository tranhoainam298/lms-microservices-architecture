import React, { useEffect, useState } from 'react';
import { apiUrl } from '../config/api';

export default function AdminUserManagement({ accessToken, currentUserId }) {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [changingAction, setChangingAction] = useState(null);
  const [error, setError] = useState('');

  const loadUsers = async (page = data.page) => {
    setLoading(true); setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    try {
      const response = await fetch(apiUrl(`/users/admin/users?${params}`), { headers: { Authorization: `Bearer ${accessToken}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'User accounts could not be loaded.');
      setData(body);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(1); }, [accessToken]);

  const submitFilters = event => { event.preventDefault(); loadUsers(1); };
  const changeStatus = async user => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`${nextStatus === 'inactive' ? 'Deactivate' : 'Activate'} ${user.email}?`)) return;
    setChangingAction(`status-${user.id}`); setError('');
    try {
      const response = await fetch(apiUrl(`/users/admin/users/${user.id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Account status could not be changed.');
      await loadUsers(data.page);
    } catch (requestError) { setError(requestError.message); }
    finally { setChangingAction(null); }
  };

  const changeRole = async (user, nextRole) => {
    if (String(user.id) === String(currentUserId)) {
      setError('You cannot change your own administrator role.');
      return;
    }
    if (nextRole === user.role) return;
    if (!window.confirm(`Change ${user.email} from ${user.role} to ${nextRole}?`)) return;
    setChangingAction(`role-${user.id}`); setError('');
    try {
      const response = await fetch(apiUrl(`/users/admin/users/${user.id}/role`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ role: nextRole })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Account role could not be changed.');
      await loadUsers(data.page);
    } catch (requestError) { setError(requestError.message); }
    finally { setChangingAction(null); }
  };

  return <section className="account-page">
    <header className="section-heading"><div><p className="section-kicker">Administration</p><h2>User management</h2></div></header>
    <form className="card admin-user-filters" onSubmit={submitFilters}>
      <input className="form-control" aria-label="Search users" placeholder="Search email or name" value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} maxLength="100" />
      <select className="form-control" aria-label="Role filter" value={filters.role} onChange={event => setFilters(value => ({ ...value, role: event.target.value }))}><option value="">All roles</option><option value="student">Student</option><option value="instructor">Instructor</option><option value="admin">Admin</option></select>
      <select className="form-control" aria-label="Status filter" value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      <button className="btn btn-primary" type="submit">Apply</button>
    </form>
    {error && <div className="form-alert form-alert--error" role="alert">{error}</div>}
    {loading ? <div className="card" role="status">Loading user accounts...</div> : <div className="card table-shell"><table className="data-table"><thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th>Account action</th></tr></thead><tbody>{data.items.length === 0 ? <tr><td colSpan="6">No accounts match the selected filters.</td></tr> : data.items.map(user => {
      const isCurrentUser = String(user.id) === String(currentUserId);
      const roleChanging = changingAction === `role-${user.id}`;
      const statusChanging = changingAction === `status-${user.id}`;
      return <tr key={user.id}><td>{user.email}</td><td>{user.fullName || 'Not provided'}</td><td><select className="form-control" aria-label={`Role for ${user.email}`} value={user.role} onChange={event => changeRole(user, event.target.value)} disabled={Boolean(changingAction) || isCurrentUser}><option value="student">Student</option><option value="instructor">Instructor</option><option value="admin">Admin</option></select>{isCurrentUser && <small>Current account</small>}{roleChanging && <small>Saving role...</small>}</td><td>{user.status}</td><td>{new Date(user.createdAt).toLocaleString()}</td><td><button className="btn btn-secondary btn-sm" type="button" onClick={() => changeStatus(user)} disabled={Boolean(changingAction) || (isCurrentUser && user.status === 'active')}>{statusChanging ? 'Saving...' : user.status === 'active' ? 'Deactivate' : 'Activate'}</button></td></tr>;
    })}</tbody></table></div>}
    <div className="pagination-controls"><button className="btn btn-secondary" disabled={data.page <= 1 || loading} onClick={() => loadUsers(data.page - 1)}>Previous</button><span>Page {data.page} · {data.total} users</span><button className="btn btn-secondary" disabled={data.page * data.pageSize >= data.total || loading} onClick={() => loadUsers(data.page + 1)}>Next</button></div>
  </section>;
}
