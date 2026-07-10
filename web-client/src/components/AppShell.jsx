import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children, currentTab, onTabChange, user, onLogout, pageMeta }) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  useEffect(() => {
    setIsNavigationOpen(false);
  }, [currentTab]);

  useEffect(() => {
    if (!isNavigationOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNavigationOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNavigationOpen]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        user={user}
        onLogout={onLogout}
        isOpen={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />
      {isNavigationOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsNavigationOpen(false)}
        />
      )}
      <div className="app-shell__workspace">
        <Header
          user={user}
          pageMeta={pageMeta}
          onMenuToggle={() => setIsNavigationOpen(true)}
        />
        <main className="app-shell__content" id="main-content" tabIndex="-1">
          <div className="page-transition" key={currentTab}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
