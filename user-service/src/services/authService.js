import { mockUsers } from '../data/mockUsers.js';

const allowedRoles = new Set(['student', 'instructor', 'admin']);

export function authenticateUser({ email, password, role }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';

  if (!normalizedEmail || !password || !normalizedRole) {
    return {
      status: 400,
      body: {
        code: 'MISSING_FIELDS',
        message: 'Email, password, and role are required.'
      }
    };
  }

  if (!allowedRoles.has(normalizedRole)) {
    return {
      status: 400,
      body: {
        code: 'INVALID_ROLE',
        message: 'Role must be student, instructor, or admin.'
      }
    };
  }

  const user = mockUsers.find(candidate => candidate.email === normalizedEmail);

  if (!user || user.password !== password) {
    return {
      status: 401,
      body: {
        code: 'INVALID_LOGIN',
        message: 'Email or password is incorrect.'
      }
    };
  }

  if (user.isLocked) {
    return {
      status: 403,
      body: {
        code: 'ACCOUNT_LOCKED',
        message: 'This account is locked.'
      }
    };
  }

  if (user.role !== normalizedRole) {
    return {
      status: 403,
      body: {
        code: 'ROLE_MISMATCH',
        message: 'Selected role does not match this account.'
      }
    };
  }

  return {
    status: 200,
    body: {
      accessToken: `mock-token-${user.role}-${user.id}`,
      userProfile: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      },
      role: user.role
    }
  };
}
