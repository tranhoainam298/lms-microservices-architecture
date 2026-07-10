import React from 'react';

export default function ArchitectureFlow({ label = 'Request flow', ariaLabel, steps = [], compact = false }) {
  return (
    <div
      className={`architecture-flow${compact ? ' architecture-flow--compact' : ''}`}
      aria-label={ariaLabel || `${label}: ${steps.join(' to ')}`}
    >
      <span className="architecture-flow__label">{label}</span>
      <ol className="architecture-flow__steps">
        {steps.map((step, index) => (
          <li className="architecture-flow__step" key={`${step}-${index}`}>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
