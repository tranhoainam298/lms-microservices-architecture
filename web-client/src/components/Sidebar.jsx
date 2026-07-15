import React from 'react';

const navigationGroups = [
  {
    label: 'Account',
    role: 'all',
    items: [
      { id: 'home', label: 'Home', short: 'H' },
      { id: 'profile', label: 'My profile', short: 'ME' }
    ]
  },
  {
    label: 'Student tools',
    role: 'student',
    items: [
      { id: 'dashboard', label: 'Student dashboard', short: 'S' },
      { id: 'lesson', label: 'Lesson viewer', short: 'L' },
      { id: 'quiz', label: 'Quiz module', short: 'Q' },
      { id: 'payment', label: 'Payment', short: 'P' }
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
    items: [
      { id: 'revenue-report', label: 'Revenue and sales', short: 'R' },
      { id: 'user-management', label: 'User management', short: 'U' }
    ]
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
          <button className="sidebar__brand" type="button" onClick={() => handleNavigate('home')}>
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
          {navigationGroups.filter(group => group.role === 'all' || group.role === user.role).map((group) => {
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
