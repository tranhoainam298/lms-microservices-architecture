import React from 'react';

export default function Header({ user, onLogout }) {
  const headerStyle = {
    height: 'var(--header-height)',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 100
  };

  const userSecStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  };

  const avatarStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-light)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '0.875rem'
  };

  const roleBadgeStyle = {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  };

  const getInitials = (name) => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header style={headerStyle}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>LMS Architecture Demo</h2>
      </div>
      <div style={userSecStyle}>
        <span style={roleBadgeStyle}>{user.role}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>{user.full_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
        </div>
        <div style={avatarStyle}>
          {getInitials(user.full_name)}
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }} 
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
