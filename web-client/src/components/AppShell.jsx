import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children, currentTab, onTabChange, user, onLogout }) {
  const mainWrapperStyle = {
    marginLeft: 'var(--sidebar-width)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)'
  };

  const contentStyle = {
    flexGrow: 1,
    padding: '2rem',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto'
  };

  return (
    <div>
      <Sidebar currentTab={currentTab} onTabChange={onTabChange} role={user.role} />
      <div style={mainWrapperStyle}>
        <Header user={user} onLogout={onLogout} />
        <main style={contentStyle}>
          {children}
        </main>
      </div>
    </div>
  );
}
