import React from 'react';

export default function Sidebar({ currentTab, onTabChange, role }) {
  const sidebarStyle = {
    width: 'var(--sidebar-width)',
    height: '100vh',
    backgroundColor: '#0f172a', /* Dark slate */
    color: '#94a3b8',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'fixed',
    left: 0,
    top: 0
  };

  const logoStyle = {
    color: '#ffffff',
    fontSize: '1.5rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const navListStyle = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  const getLinkStyle = (tabId) => {
    const isActive = currentTab === tabId;
    return {
      display: 'block',
      padding: '0.75rem 1rem',
      borderRadius: 'var(--border-radius-sm)',
      color: isActive ? '#ffffff' : '#94a3b8',
      backgroundColor: isActive ? '#1e293b' : 'transparent',
      textDecoration: 'none',
      fontWeight: isActive ? '500' : '400',
      transition: 'all var(--transition-fast)'
    };
  };

  return (
    <div style={sidebarStyle}>
      <div>
        <div style={logoStyle}>
          <span style={{ color: 'var(--primary)' }}>🎓</span> LMS Portal
        </div>
        
        <nav>
          <ul style={navListStyle}>
            {role === 'student' && (
              <>
                <li>
                  <a 
                    href="#" 
                    style={getLinkStyle('dashboard')} 
                    onClick={(e) => { e.preventDefault(); onTabChange('dashboard'); }}
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a 
                    href="#" 
                    style={getLinkStyle('ai-support')} 
                    onClick={(e) => { e.preventDefault(); onTabChange('ai-support'); }}
                  >
                    AI Chatbot Help
                  </a>
                </li>
              </>
            )}
            
            {role === 'instructor' && (
              <li>
                <a 
                  href="#" 
                  style={getLinkStyle('course-draft')} 
                  onClick={(e) => { e.preventDefault(); onTabChange('course-draft'); }}
                >
                  Course Drafts
                </a>
              </li>
            )}
            
            {role === 'admin' && (
              <li>
                <a 
                  href="#" 
                  style={getLinkStyle('revenue-report')} 
                  onClick={(e) => { e.preventDefault(); onTabChange('revenue-report'); }}
                >
                  Revenue & Sales
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
      
      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
        <div>Architecture Demo v1.0</div>
        <div>SQL Server DB Mapping</div>
      </div>
    </div>
  );
}
