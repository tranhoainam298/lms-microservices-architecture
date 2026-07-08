import React from 'react';

export default function Sidebar({ currentTab, onTabChange }) {
  const sidebarStyle = {
    width: 'var(--sidebar-width)',
    height: '100vh',
    backgroundColor: '#132a32',
    color: '#aac0c4',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'fixed',
    left: 0,
    top: 0,
    borderRight: '1px solid #24434a',
    zIndex: 200
  };

  const logoStyle = {
    color: '#f4fbfa',
    fontSize: '1.25rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0 0.5rem'
  };

  const navSectionTitleStyle = {
    fontSize: '0.675rem',
    fontWeight: '700',
    color: '#719097',
    textTransform: 'uppercase',
    letterSpacing: '0.075em',
    margin: '1.25rem 0.5rem 0.5rem 0.5rem'
  };

  const navListStyle = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  };

  const getLinkStyle = (tabId) => {
    const isActive = currentTab === tabId;
    return {
      display: 'block',
      padding: '0.625rem 0.75rem',
      borderRadius: '6px',
      color: isActive ? '#ffffff' : '#aac0c4',
      backgroundColor: isActive ? 'var(--primary)' : 'transparent',
      textDecoration: 'none',
      fontWeight: isActive ? '600' : '500',
      fontSize: '0.8125rem',
      transition: 'all var(--transition-fast)',
      cursor: 'pointer'
    };
  };

  return (
    <aside className="sidebar" style={sidebarStyle}>
      <div>
        <div className="sidebar__brand" style={logoStyle}>
          <span className="sidebar__mark" aria-hidden="true">L</span> LMS Architecture
        </div>
        
        <nav>
          {/* Platform General */}
          <div style={navSectionTitleStyle}>Core System</div>
          <ul style={navListStyle}>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('overview')} 
                onClick={(e) => { e.preventDefault(); onTabChange('overview'); }}
              >
                System Overview
              </a>
            </li>
          </ul>

          {/* Student flows */}
          <div style={navSectionTitleStyle}>Student Flows</div>
          <ul style={navListStyle}>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('dashboard')} 
                onClick={(e) => { e.preventDefault(); onTabChange('dashboard'); }}
              >
                Student Dashboard
              </a>
            </li>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('lesson')} 
                onClick={(e) => { e.preventDefault(); onTabChange('lesson'); }}
              >
                Lesson Viewer
              </a>
            </li>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('quiz')} 
                onClick={(e) => { e.preventDefault(); onTabChange('quiz'); }}
              >
                Quiz Module
              </a>
            </li>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('payment')} 
                onClick={(e) => { e.preventDefault(); onTabChange('payment'); }}
              >
                Payment Simulator
              </a>
            </li>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('ai-support')} 
                onClick={(e) => { e.preventDefault(); onTabChange('ai-support'); }}
              >
                AI Study Support
              </a>
            </li>
          </ul>

          {/* Instructor flows */}
          <div style={navSectionTitleStyle}>Instructor Flows</div>
          <ul style={navListStyle}>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('course-draft')} 
                onClick={(e) => { e.preventDefault(); onTabChange('course-draft'); }}
              >
                Course Drafts
              </a>
            </li>
          </ul>

          {/* Admin flows */}
          <div style={navSectionTitleStyle}>Administrator</div>
          <ul style={navListStyle}>
            <li>
              <a 
                href="#" 
                style={getLinkStyle('revenue-report')} 
                onClick={(e) => { e.preventDefault(); onTabChange('revenue-report'); }}
              >
                Revenue & Sales
              </a>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Environment labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.5rem', borderTop: '1px solid #24434a', paddingTop: '1rem' }}>
        <div style={{ fontSize: '0.675rem', fontWeight: '700', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Microservices Demo
        </div>
        <div style={{ fontSize: '0.625rem', color: '#719097' }}>
          Architecture-aligned data mapping
        </div>
        <div style={{ fontSize: '0.625rem', color: 'var(--primary)' }}>
          Local mock UI only
        </div>
      </div>
    </aside>
  );
}
