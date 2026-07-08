import React from 'react';

export default function StatCard({ title, value, icon, description }) {
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: '200px'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'between',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    fontWeight: '500'
  };

  const valueStyle = {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)'
  };

  const descStyle = {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)'
  };

  return (
    <div className="card" style={cardStyle}>
      <div style={headerStyle}>
        <span>{title}</span>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      </div>
      <div style={valueStyle}>{value}</div>
      {description && <div style={descStyle}>{description}</div>}
    </div>
  );
}
