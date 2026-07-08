import React from 'react';
import StatusBadge from './StatusBadge';

export default function CourseCard({ course, isEnrolled, onAction, actionLabel }) {
  const progressValue = isEnrolled ? course.progress_percent || 0 : 0;
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    gap: '1rem'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    gap: '0.75rem'
  };

  const priceStyle = {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--primary)',
    fontFamily: 'var(--font-title)'
  };

  return (
    <article className="card course-card" style={cardStyle}>
      <div>
        <div style={headerStyle}>
          <h3 style={{ fontSize: '1rem', lineHeight: '1.4', fontWeight: '600' }}>{course.title}</h3>
          <StatusBadge status={course.status} />
        </div>
        <p className="text-xs text-secondary-color" style={{ marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '54px' }}>
          {course.description}
        </p>
        {isEnrolled && (
          <div className="course-progress" aria-label={`${course.title} progress: ${progressValue}%`}>
            <div className="course-progress__meta">
              <span>Course progress</span>
              <strong>{progressValue}%</strong>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressValue}%` }} />
            </div>
          </div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: 'auto' }}>
        <div style={priceStyle}>
          {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
        </div>
        <button 
          className="btn btn-primary" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }} 
          onClick={() => onAction(course)}
        >
          {actionLabel || (isEnrolled ? 'Open classroom' : 'Buy course')}
        </button>
      </div>
    </article>
  );
}
