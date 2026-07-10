import React from 'react';

export default function ProgressBar({ value = 0, label = 'Progress', tone = 'primary', showValue = true }) {
  const normalizedValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div className="progress" aria-label={`${label}: ${normalizedValue}%`}>
      {showValue && (
        <div className="progress__meta">
          <span>{label}</span>
          <strong>{normalizedValue}%</strong>
        </div>
      )}
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={normalizedValue}
        aria-label={label}
      >
        <span
          className={`progress__fill progress__fill--${tone}`}
          style={{ '--progress-scale': normalizedValue / 100 }}
        />
      </div>
    </div>
  );
}
