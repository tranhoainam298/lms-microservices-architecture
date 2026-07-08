import React from 'react';

export default function StatCard({ title, value, description }) {
  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    minWidth: '200px'
  };

  const titleStyle = {
    color: 'var(--text-secondary)',
    fontSize: '0.8125rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const valueStyle = {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
    lineHeight: '1.2'
  };

  const descStyle = {
    fontSize: '0.75rem',
    color: 'var(--text-tertiary)'
  };

  return (
    <div className="card stat-card" style={cardStyle}>
      <div style={titleStyle}>{title}</div>
      <div style={valueStyle}>{value}</div>
      {description && <div style={descStyle}>{description}</div>}
    </div>
  );
}
