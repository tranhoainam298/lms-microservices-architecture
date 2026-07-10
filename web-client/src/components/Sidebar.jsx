import React from 'react';

const navigationGroups = [
  {
    label: 'Platform',
    role: 'all',
    items: [{ id: 'overview', label: 'Overview', short: 'O' }]
  },
  {
    label: 'Student tools',
    role: 'student',
    items: [
      { id: 'dashboard', label: 'Student dashboard', short: 'S' },
      { id: 'lesson', label: 'Lesson viewer', short: 'L' },
      { id: 'quiz', label: 'Quiz module', short: 'Q' },
      { id: 'payment', label: 'Payment', short: 'P' },
      { id: 'ai-support', label: 'AI study support', short: 'AI' }
    ]
  },
  {
    label: 'Instructor tools',
    role: 'instructor',
    items: [{ id: 'course-draft', label: 'Course drafts', short: 'C' }]
  },
  {
    label: 'Administration',
    role: 'admin',
    items: [{ id: 'revenue-report', label: 'Revenue and sales', short: 'R' }]
  }
];

export default function Sidebar({ currentTab, onTabChange, user, onLogout, isOpen, onClose }) {
  const handleNavigate = (tabId) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`} aria-label="Primary navigation">
      <div className="sidebar__top">
        <div className="sidebar__brand-row">
          <button className="sidebar__brand" type="button" onClick={() => handleNavigate('overview')}>
            <span className="sidebar__mark" aria-hidden="true">M</span>
            <span className="sidebar__brand-copy">
              <strong>Meridian LMS</strong>
              <small>Learning operations</small>
            </span>
          </button>
          <button className="sidebar__close" type="button" onClick={onClose} aria-label="Close navigation">
            Close
          </button>
        </div>

        <nav className="sidebar__navigation">
          {navigationGroups.map((group) => {
            const isCurrentRole = group.role === user.role;
            return (
              <section className={`nav-group${isCurrentRole ? ' nav-group--current' : ''}`} key={group.label}>
                <div className="nav-group__heading">
                  <span>{group.label}</span>
                  {isCurrentRole && <small>Your role</small>}
                </div>
                <ul className="nav-list">
                  {group.items.map((item) => {
                    const isActive = currentTab === item.id;
                    return (
                      <li key={item.id}>
                        <button
                          className={`nav-item${isActive ? ' nav-item--active' : ''}`}
                          type="button"
                          onClick={() => handleNavigate(item.id)}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="nav-item__icon" aria-hidden="true">{item.short}</span>
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>
      </div>

      <div className="sidebar__bottom">
        <aside className="architecture-summary" aria-label="Architecture summary">
          <div className="architecture-summary__heading">
            <span className="status-dot status-dot--active" aria-hidden="true" />
            <strong>Architecture demo</strong>
          </div>
          <p>5 service boundaries, 4 owned databases, and RabbitMQ event flow.</p>
          <span>Frontend ready / local services optional</span>
        </aside>
        <div className="sidebar__user">
          <div className="sidebar__avatar" aria-hidden="true">
            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user.full_name}</strong>
            <span>{user.role}</span>
          </div>
          <button className="sidebar__logout" type="button" onClick={onLogout} aria-label="Log out">
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
