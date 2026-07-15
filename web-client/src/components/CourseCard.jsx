import React from 'react';
import ProgressBar from './ProgressBar';
import StatusBadge from './StatusBadge';

export default function CourseCard({ course, isEnrolled, onAction, actionLabel }) {
  const progressValue = isEnrolled ? course.progress_percent || 0 : 0;
  const coverImage = course.cover_image || course.coverImage;

  return (
    <article className={`course-card${isEnrolled ? ' course-card--enrolled' : ''}`}>
      <div className="course-card__visual" aria-hidden="true">
        {coverImage && <img src={coverImage} alt="" loading="lazy" />}
        <span>{course.id}</span>
        <i />
      </div>
      <div className="course-card__body">
        <div className="course-card__header">
          <div>
            <span className="course-card__eyebrow">Course catalog</span>
            <h3>{course.title}</h3>
          </div>
          <StatusBadge status={isEnrolled ? 'active' : course.status} />
        </div>
        <p className="course-card__description">{course.description}</p>
        {isEnrolled && (
          <ProgressBar value={progressValue} label="Course progress" tone={progressValue === 100 ? 'success' : 'primary'} />
        )}
        <div className="course-card__footer">
          <div className="course-card__price">
            <span>{isEnrolled ? 'Access' : 'Course price'}</span>
            <strong>{isEnrolled ? 'Enrolled' : Number(course.price) === 0 ? 'Free' : `$${Number(course.price).toFixed(2)}`}</strong>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => onAction(course)}>
            {actionLabel || (isEnrolled ? 'Open classroom' : 'Buy course')}
          </button>
        </div>
        {!isEnrolled && (
          <span className="course-card__catalog-price" aria-hidden="true">
          {Number(course.price) === 0 ? 'Free' : `$${Number(course.price).toFixed(2)}`}
          </span>
        )}
      </div>
    </article>
  );
}
