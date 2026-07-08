import React from 'react';

export default function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase();
  
  const styles = {
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content'
  };

  if (normalized === 'active' || normalized === 'published' || normalized === 'success' || normalized === 'completed' || normalized === 'paid') {
    return (
      <span style={{ ...styles, backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
        {status}
      </span>
    );
  } else if (normalized === 'pending' || normalized === 'draft' || normalized === 'in_progress') {
    return (
      <span style={{ ...styles, backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
        {status}
      </span>
    );
  } else {
    return (
      <span style={{ ...styles, backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
        {status}
      </span>
    );
  }
}
