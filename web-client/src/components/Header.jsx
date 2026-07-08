import React from 'react';

export default function Header({ user, onLogout, title }) {
  const getInitials = (name) => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="top-header">
      <div className="top-header__title">
        <span className="top-header__eyebrow">LMS Microservices Demo</span>
        <h1>{title || 'System Overview'}</h1>
      </div>
      
      <div className="top-header__account">
        <span className="service-badge">API Gateway entry</span>
        <span className="role-badge">{user.role}</span>
        <div className="top-header__identity">
          <strong>{user.full_name}</strong>
          <span>{user.email}</span>
        </div>
        <div className="avatar" aria-hidden="true">
          {getInitials(user.full_name)}
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
