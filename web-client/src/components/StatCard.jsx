import React from 'react';

export default function StatCard({ title, value, description, eyebrow, tone = 'default' }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__topline">
        <span>{eyebrow || title}</span>
        <i aria-hidden="true" />
      </div>
      <strong className="metric-card__value">{value}</strong>
      {description && <p>{description}</p>}
    </article>
  );
}
