import React from 'react';

export default function Header({ user, onLogout, title, subtitle }) {
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

  const gatewayBadgeStyle = {
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.675rem',
    fontWeight: '700',
    backgroundColor: '#f5f3ff',
    border: '1px dashed #6366f1',
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const roleBadgeStyle = {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.725rem',
    fontWeight: '600',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  };

  const getInitials = (name) => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-title)' }}>
          {title || 'Overview'}
        </h2>
        {subtitle && (
          <p className="text-xs text-secondary-color">
            {subtitle}
          </p>
        )}
      </div>
      
      <div style={userSecStyle}>
        <span style={gatewayBadgeStyle}>API Gateway Mock Entry</span>
        <span style={roleBadgeStyle}>{user.role}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '600' }}>{user.full_name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{user.email}</div>
        </div>
        <div style={avatarStyle}>
          {getInitials(user.full_name)}
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: '600' }} 
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
