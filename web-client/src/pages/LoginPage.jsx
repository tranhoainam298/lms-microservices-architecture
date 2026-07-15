import React, { useState } from 'react';
import { apiUrl } from '../config/api';

const demoRoles = [
  {
    id: 'student',
    label: 'Student',
    shortLabel: 'ST',
    description: 'Continue lessons, quizzes, and course access.'
  },
  {
    id: 'instructor',
    label: 'Instructor',
    shortLabel: 'IN',
    description: 'Create and manage course drafts.'
  },
  {
    id: 'admin',
    label: 'Administrator',
    shortLabel: 'AD',
    description: 'Review revenue and platform activity.'
  }
];

export default function LoginPage({ onLogin, onBrowseCourses }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState('');

  const selectedDemoRole = demoRoles.find(option => option.id === role) || demoRoles[0];

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    setFieldErrors(currentErrors => ({ ...currentErrors, email: '' }));

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
    if (mode === 'register') {
      if (!fullName.trim()) nextErrors.fullName = 'Enter your full name.';
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        nextErrors.password = 'Use at least 8 characters with a letter and a number.';
      }
      if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
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
      const response = await fetch(apiUrl(`/auth/${mode === 'register' ? 'register' : 'login'}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register'
          ? { email, password, fullName, role: 'student' }
          : { email, password, role })
      });
      const responseBody = await response.json();

      if (!response.ok) {
        if (response.status === 403 && responseBody.code === 'ROLE_MISMATCH') {
          throw new Error('Selected role does not match this account.');
        }
        throw new Error(responseBody.message || 'Login failed. Check your credentials and role.');
      }

      if (mode === 'register') {
        const normalizedEmail = responseBody.user.email;
        setMode('login');
        setRole('student');
        setEmail(normalizedEmail);
        setPassword('');
        setFullName('');
        setConfirmPassword('');
        setSuccess('Account created. Sign in with your new student account.');
      } else {
        onLogin(responseBody);
      }
    } catch (requestError) {
      const message = requestError instanceof TypeError
        ? 'Sign in is temporarily unavailable. Please try again shortly.'
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
          <span className="login-thesis__label">Learn without limits</span>
          <h1>Your next learning milestone starts here.</h1>
          <p>
            A focused learning workspace for courses, lessons, assessments, and progress.
          </p>

          <dl className="login-value-list">
            <div>
              <dt>Secure access</dt>
              <dd>Protected sign-in for every account.</dd>
            </div>
            <div>
              <dt>Role-aware</dt>
              <dd>Purpose-built workspaces for every learner and educator.</dd>
            </div>
          </dl>
        </div>

      </aside>

      <main className="login-panel">
        <div className="login-panel__heading">
          <span className="page-kicker">{mode === 'register' ? 'Student registration' : 'Welcome back'}</span>
          <h2>{mode === 'register' ? 'Create your student account' : 'Sign in to your workspace'}</h2>
          <p>{mode === 'register' ? 'Create your student account to start learning.' : 'Sign in to continue to your workspace.'}</p>
        </div>

        <div className="login-mode-switch" role="group" aria-label="Authentication mode">
          <button type="button" className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign in</button>
          <button type="button" className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setMode('register'); setRole('student'); setEmail(''); setPassword(''); setError(''); setSuccess(''); }}>Register</button>
        </div>

        <button className="btn btn-secondary w-full login-browse-courses" type="button" onClick={onBrowseCourses}>Browse courses</button>

        <div className="login-route-summary" aria-label="Secure sign-in status">
          <span className="login-route-summary__status" aria-hidden="true" />
          <div>
            <strong>Secure sign-in</strong>
            <span>Your account information is protected.</span>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {mode === 'login' && <fieldset className="login-role-selector" disabled={isLoading}>
            <legend>Choose your role</legend>
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
          </fieldset>}

          {mode === 'register' && (
            <div className={`form-group${fieldErrors.fullName ? ' has-error' : ''}`}>
              <label htmlFor="register-full-name">Full name</label>
              <input id="register-full-name" className="form-control" value={fullName} onChange={event => { setFullName(event.target.value); setFieldErrors(errors => ({ ...errors, fullName: '' })); }} autoComplete="name" disabled={isLoading} />
              {fieldErrors.fullName && <p className="field-error" role="alert">{fieldErrors.fullName}</p>}
            </div>
          )}

          <div className={`form-group${fieldErrors.email ? ' has-error' : ''}`}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              placeholder="you@example.com"
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

          {mode === 'register' && (
            <div className={`form-group${fieldErrors.confirmPassword ? ' has-error' : ''}`}>
              <label htmlFor="confirm-password">Confirm password</label>
              <input id="confirm-password" type="password" className="form-control" value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); setFieldErrors(errors => ({ ...errors, confirmPassword: '' })); }} autoComplete="new-password" disabled={isLoading} />
              {fieldErrors.confirmPassword && <p className="field-error" role="alert">{fieldErrors.confirmPassword}</p>}
            </div>
          )}

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
            <p className="field-helper" id="password-helper">Enter the password for your account.</p>
            {fieldErrors.password && <p className="field-error" id="password-error" role="alert">{fieldErrors.password}</p>}
          </div>

          <div className="login-form__feedback" aria-live="polite" aria-atomic="true">
            {error && <div className="form-alert form-alert--error" id="login-error" role="alert">{error}</div>}
            {success && <div className="form-alert form-alert--success" role="status">{success}</div>}
            {isLoading && !error && <p className="form-status" role="status">Signing you in...</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full login-submit"
            disabled={isLoading}
            aria-describedby={error ? 'login-error' : undefined}
          >
            {isLoading && <span className="button-spinner" aria-hidden="true" />}
            {isLoading ? (mode === 'register' ? 'Creating account...' : 'Signing in...') : (mode === 'register' ? 'Create student account' : `Continue as ${selectedDemoRole.label}`)}
          </button>
        </form>

        {mode === 'login' && <section className="login-demo-hint" aria-label="Selected workspace">
          <div>
            <span className="login-demo-hint__label">Selected workspace</span>
            <strong>{selectedDemoRole.label}</strong>
          </div>
        </section>}
      </main>
    </div>
  );
}
