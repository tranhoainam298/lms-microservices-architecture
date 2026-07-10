import React from 'react';

const successStates = new Set(['active', 'published', 'success', 'completed', 'paid', 'graded', 'ready']);
const warningStates = new Set(['pending', 'draft', 'in_progress', 'processing']);
const dangerStates = new Set(['failed', 'error', 'blocked', 'unavailable']);

export default function StatusBadge({ status = 'unknown', tone }) {
  const normalized = (status || '').toLowerCase();
  const resolvedTone = tone
    || (successStates.has(normalized) ? 'success' : null)
    || (warningStates.has(normalized) ? 'warning' : null)
    || (dangerStates.has(normalized) ? 'danger' : 'neutral');
  const label = String(status).replaceAll('_', ' ');

  return (
    <span className={`status-badge status-badge--${resolvedTone}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
