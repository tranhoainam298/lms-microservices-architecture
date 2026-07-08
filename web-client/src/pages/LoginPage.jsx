import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('student@lms.edu');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'student') {
      setEmail('student@lms.edu');
    } else if (selectedRole === 'instructor') {
      setEmail('instructor@lms.edu');
    } else if (selectedRole === 'admin') {
      setEmail('admin@lms.edu');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)'
  };

  const loginCardStyle = {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem',
    borderRadius: 'var(--border-radius)',
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-lg)'
  };

  const alertStyle = {
    padding: '0.75rem',
    backgroundColor: 'var(--danger-light)',
    color: 'var(--danger)',
    fontSize: '0.8125rem',
    borderRadius: 'var(--border-radius-sm)',
    marginBottom: '1.25rem',
    fontWeight: '500'
  };

  return (
    <div className="login-page" style={containerStyle}>
      <aside className="login-thesis">
        <div>
          <span className="login-thesis__label">LMS architecture demo</span>
          <h1>Learn the course.<br />See the system.</h1>
          <p>A working interface for exploring how learning flows cross clear microservice boundaries.</p>
        </div>
        <div className="login-topology" aria-label="Login request architecture">
          <span>Web Client</span><i aria-hidden="true" />
          <span>API Gateway</span><i aria-hidden="true" />
          <span>User Service</span><i aria-hidden="true" />
          <span>User DB</span>
        </div>
      </aside>

      <div className="login-panel" style={loginCardStyle}>
        <div className="login-panel__heading">
          <span className="page-kicker">Choose a demo role</span>
          <h2>Enter the learning workspace</h2>
          <p>Each role opens a different view of the same architecture.</p>
        </div>

        <div className="architecture-alert">
          <span>Account Management: Login</span>
          <span className="architecture-alert__detail">User Service routes to User DB</span>
        </div>

        {error && <div style={alertStyle} role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Demo role</label>
            <select 
              id="role" 
              className="form-control" 
              value={role} 
              onChange={handleRoleChange}
              disabled={isLoading}
              style={{ cursor: 'pointer' }}
            >
              <option value="student">Student / Learner</option>
              <option value="instructor">Instructor / Academic</option>
              <option value="admin">Platform Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              id="email"
              type="email" 
              className="form-control"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoComplete="username"
              disabled={isLoading}
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              className="form-control"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
              disabled={isLoading}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-6" style={{ fontWeight: '600' }} disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Enter demo'}
          </button>
        </form>
      </div>
    </div>
  );
}
