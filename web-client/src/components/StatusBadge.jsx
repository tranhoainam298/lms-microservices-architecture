import React from 'react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  
  let styles = {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-block'
  };

  if (normalized === 'active' || normalized === 'published' || normalized === 'success' || normalized === 'completed' || normalized === 'paid') {
    styles = {
      ...styles,
      backgroundColor: 'var(--success-light)',
      color: 'var(--success)'
    };
  } else if (normalized === 'pending' || normalized === 'draft' || normalized === 'in_progress') {
    styles = {
      ...styles,
      backgroundColor: 'var(--warning-light)',
      color: 'var(--warning)'
    };
  } else {
    styles = {
      ...styles,
      backgroundColor: 'var(--danger-light)',
      color: 'var(--danger)'
    };
  }

  return (
    <span style={styles}>
      {status}
    </span>
  );
}
