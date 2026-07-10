import React, { useState } from 'react';

const demoRoles = [
  {
    id: 'student',
    label: 'Student',
    shortLabel: 'ST',
    email: 'student@lms.edu',
    description: 'Continue lessons, quizzes, and course access.'
  },
  {
    id: 'instructor',
    label: 'Instructor',
    shortLabel: 'IN',
    email: 'instructor@lms.edu',
    description: 'Create and manage course drafts.'
  },
  {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'AD',
    email: 'admin@lms.edu',
    description: 'Review revenue and platform activity.'
  }
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('student@lms.edu');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const selectedDemoRole = demoRoles.find(option => option.id === role) || demoRoles[0];

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    setFieldErrors(currentErrors => ({ ...currentErrors, email: '' }));

    const nextRole = demoRoles.find(option => option.id === selectedRole);
    if (nextRole) setEmail(nextRole.email);
  };

  const validateFields = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = 'Enter the email address for this account.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Enter the account password.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateFields()) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const responseBody = await response.json();

      if (!response.ok) {
        if (response.status === 403 && responseBody.code === 'ROLE_MISMATCH') {
          throw new Error('Selected role does not match this account.');
        }
        throw new Error(responseBody.message || 'Login failed. Check your credentials and role.');
      }

      onLogin(responseBody);
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? 'Login service is unavailable. Start the API Gateway and User Service, then try again.'
        : requestError.message;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-thesis">
        <div className="login-thesis__content">
          <div className="login-brand" aria-label="Meridian LMS learning platform">
            <span className="login-brand__mark" aria-hidden="true">M</span>
            <span className="login-brand__name">Meridian LMS</span>
          </div>
          <span className="login-thesis__label">LMS architecture demo</span>
          <h1>Learning, with the system in full view.</h1>
          <p>
            A focused university workspace where every learning action maps to a clear
            microservice boundary.
          </p>

          <dl className="login-value-list">
            <div>
              <dt>One entry point</dt>
              <dd>Authenticated through the API Gateway.</dd>
            </div>
            <div>
              <dt>Role-aware</dt>
              <dd>Purpose-built workspaces for every demo account.</dd>
            </div>
          </dl>
        </div>

        <div className="login-topology" aria-label="Login request architecture">
          <span>Web Client</span><i aria-hidden="true" />
          <span>API Gateway</span><i aria-hidden="true" />
          <span>User Service</span><i aria-hidden="true" />
          <span>User DB</span>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-panel__heading">
          <span className="page-kicker">Welcome back</span>
          <h2>Sign in to your workspace</h2>
          <p>Select a role to load its demo account, then authenticate through the live gateway.</p>
        </div>

        <div className="login-route-summary" aria-label="Authentication service route">
          <span className="login-route-summary__status" aria-hidden="true" />
          <div>
            <strong>API Gateway route configured</strong>
            <span>User Service authentication route</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="login-role-selector" disabled={isLoading}>
            <legend>Choose a demo role</legend>
            <div className="login-role-grid">
              {demoRoles.map(option => {
                const isSelected = role === option.id;
                return (
                  <button
                    type="button"
                    className={`login-role-card${isSelected ? ' is-selected' : ''}`}
                    key={option.id}
                    onClick={() => handleRoleChange(option.id)}
                    aria-pressed={isSelected}
                    disabled={isLoading}
                  >
                    <span className="login-role-card__mark" aria-hidden="true">{option.shortLabel}</span>
                    <span className="login-role-card__copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="login-role-card__indicator" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className={`form-group${fieldErrors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
                setFieldErrors(currentErrors => ({ ...currentErrors, email: '' }));
              }}
              autoComplete="username"
              disabled={isLoading}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'email-helper email-error' : 'email-helper'}
              required
            />
            <p className="field-helper" id="email-helper">Use the account linked to the selected role.</p>
            {fieldErrors.email && <p className="field-error" id="email-error" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className={`form-group${fieldErrors.password ? ' has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                  setFieldErrors(currentErrors => ({ ...currentErrors, password: '' }));
                }}
                autoComplete="current-password"
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-helper password-error' : 'password-helper'}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(currentValue => !currentValue)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="password"
                disabled={isLoading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="field-helper" id="password-helper">Demo credentials are shown below.</p>
            {fieldErrors.password && <p className="field-error" id="password-error" role="alert">{fieldErrors.password}</p>}
          </div>

          <div className="login-form__feedback" aria-live="polite" aria-atomic="true">
            {error && <div className="form-alert form-alert--error" id="login-error" role="alert">{error}</div>}
            {isLoading && !error && <p className="form-status" role="status">Authenticating with the API Gateway...</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full login-submit"
            disabled={isLoading}
            aria-describedby={error ? 'login-error' : undefined}
          >
            {isLoading && <span className="button-spinner" aria-hidden="true" />}
            {isLoading ? 'Signing in...' : `Continue as ${selectedDemoRole.label}`}
          </button>
        </form>

        <section className="login-demo-hint" aria-label="Demo account credentials">
          <div>
            <span className="login-demo-hint__label">Selected demo account</span>
            <strong>{selectedDemoRole.email}</strong>
          </div>
          <div>
            <span className="login-demo-hint__label">Shared password</span>
            <code>password123</code>
          </div>
        </section>
      </main>
    </div>
  );
}
