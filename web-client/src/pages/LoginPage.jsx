import React, { useState } from 'react';
import { mockUsers } from '../data/mockData';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('student@lms.edu');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    if (selectedRole === 'student') {
      setEmail('student@lms.edu');
    } else if (selectedRole === 'instructor') {
      setEmail('instructor@lms.edu');
    } else if (selectedRole === 'admin') {
      setEmail('admin@lms.edu');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const foundUser = mockUsers.find(u => u.email === email && u.role === role);
    if (foundUser) {
      onLogin(foundUser);
    } else {
      setError('Invalid credentials for the selected role.');
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
    <div style={containerStyle}>
      <div style={loginCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontFamily: 'var(--font-title)', color: 'var(--primary)', fontWeight: '700' }}>
            LMS Platform Portal
          </h1>
          <p className="text-xs text-secondary-color" style={{ marginTop: '0.25rem' }}>
            Microservices Architecture Prototype
          </p>
        </div>

        <div className="architecture-alert">
          <span>Flow: **Account Management: Login** (User Service routing to User DB)</span>
        </div>

        {error && <div style={alertStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="role">Select System Persona</label>
            <select 
              id="role" 
              className="form-control" 
              value={role} 
              onChange={handleRoleChange}
              style={{ cursor: 'pointer' }}
            >
              <option value="student">Student / Learner</option>
              <option value="instructor">Instructor / Academic</option>
              <option value="admin">Platform Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary w-full mt-6" style={{ fontWeight: '600' }}>
            Authenticate & Enter
          </button>
        </form>
      </div>
    </div>
  );
}
