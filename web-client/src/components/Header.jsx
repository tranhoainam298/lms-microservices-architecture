import React from 'react';

export default function Header({ user, pageMeta, onMenuToggle }) {
  const getInitials = (name) => {
    return (name || '')
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className="top-header">
      <button className="top-header__menu" type="button" onClick={onMenuToggle} aria-label="Open navigation">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <div className="top-header__title">
        <div className="top-header__context">
          <span>Meridian LMS</span>
          <i aria-hidden="true">/</i>
          <span>{pageMeta?.context || 'Workspace'}</span>
        </div>
        <h1>{pageMeta?.title || 'My learning'}</h1>
        <p>{pageMeta?.subtitle}</p>
      </div>

      <div className="top-header__account">
        <span className="gateway-status">
          <span className="status-dot" aria-hidden="true" />
          Connected
        </span>
        <span className="role-badge">{user.role} role</span>
        <div className="top-header__identity">
          <strong>{user.full_name}</strong>
          <span>{user.email}</span>
        </div>
        <div className="avatar" aria-hidden="true">
          {getInitials(user.full_name)}
        </div>
      </div>
    </header>
  );
}
