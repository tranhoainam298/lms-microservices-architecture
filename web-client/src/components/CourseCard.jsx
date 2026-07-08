import React from 'react';
import StatusBadge from './StatusBadge';

export default function CourseCard({ course, isEnrolled, onAction, actionLabel }) {
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '0.75rem'
  };

  const priceStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--primary)',
    fontFamily: 'var(--font-title)',
    marginTop: '1rem'
  };

  return (
    <div className="card" style={cardStyle}>
      <div>
        <div style={headerStyle}>
          <h3 style={{ fontSize: '1.1rem', lineHeight: '1.4' }}>{course.title}</h3>
          <StatusBadge status={course.status} />
        </div>
        <p className="text-sm text-secondary-color" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {course.description}
        </p>
      </div>
      <div>
        <div style={priceStyle}>
          {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary w-full" onClick={() => onAction(course)}>
            {actionLabel || (isEnrolled ? 'Open Course' : 'Purchase')}
          </button>
        </div>
      </div>
    </div>
  );
}
