import { pool } from '../data/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { publishEvent } from '../events/publisher.js';
import { recordLoginAttempt } from '../data/loginAuditRepository.js';

const JWT_SECRET = process.env.JWT_SECRET;

export async function registerUser({ email, password, fullName, role }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : 'student';

  if (!normalizedEmail || !password || !fullName) {
    return { status: 400, body: { code: 'MISSING_FIELDS', message: 'Email, password, and fullName are required.' } };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
        [normalizedEmail, hashedPassword, fullName, normalizedRole]
      );
      
      return {
        status: 201,
        body: { message: 'User registered successfully', userId: result.insertId }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { status: 409, body: { code: 'EMAIL_EXISTS', message: 'Email already exists.' } };
    }
    console.error('Error during registration:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to register user.' } };
  }
}

export async function authenticateUser({ email, password, role, ipAddress, userAgent }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || !password || !role) {
    const res = { status: 400, body: { code: 'MISSING_FIELDS', message: 'Email, password, and role are required.' } };
    await recordLoginAttempt({
      userId: null,
      loginStatus: 'failed',
      failureReason: 'missing_fields',
      ipAddress,
      userAgent
    });
    return res;
  }

  const validRoles = ['student', 'instructor', 'admin'];
  if (!validRoles.includes(role)) {
    const res = { status: 400, body: { code: 'INVALID_ROLE', message: 'Invalid role value.' } };
    await recordLoginAttempt({
      userId: null,
      loginStatus: 'failed',
      failureReason: 'invalid_role',
      ipAddress,
      userAgent
    });
    return res;
  }

  try {
    const connection = await pool.getConnection();
    let users = [];
    
    try {
      const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
      users = rows;
    } finally {
      connection.release();
    }

    if (users.length === 0) {
      const res = { status: 401, body: { code: 'INVALID_LOGIN', message: 'Email or password is incorrect.' } };
      await recordLoginAttempt({
        userId: null,
        loginStatus: 'failed',
        failureReason: 'invalid_login',
        ipAddress,
        userAgent
      });
      return res;
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const res = { status: 401, body: { code: 'INVALID_LOGIN', message: 'Email or password is incorrect.' } };
      await recordLoginAttempt({
        userId: user.id,
        loginStatus: 'failed',
        failureReason: 'invalid_login',
        ipAddress,
        userAgent
      });
      return res;
    }

    if (user.status === 'inactive' || user.is_active === 0) {
      const res = { status: 403, body: { code: 'ACCOUNT_INACTIVE', message: 'Account is inactive.' } };
      await recordLoginAttempt({
        userId: user.id,
        loginStatus: 'failed',
        failureReason: 'account_inactive',
        ipAddress,
        userAgent
      });
      return res;
    }

    if (role && user.role !== role) {
      const res = { status: 403, body: { code: 'ROLE_MISMATCH', message: 'Role mismatch.' } };
      await recordLoginAttempt({
        userId: user.id,
        loginStatus: 'failed',
        failureReason: 'role_mismatch',
        ipAddress,
        userAgent
      });
      return res;
    }

    const token = jwt.sign(
      { id: user.id, sub: String(user.id), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    await recordLoginAttempt({
      userId: user.id,
      loginStatus: 'success',
      failureReason: null,
      ipAddress,
      userAgent
    });

    // Emit event to RabbitMQ
    await publishEvent('user_events', 'user.loggedin', {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    return {
      status: 200,
      body: {
        accessToken: token,
        userProfile: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error during authentication:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to authenticate.' } };
  }
}

