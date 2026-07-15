import { pool } from '../data/database.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createUserLoggedInEvent, publishEvent, USER_LOGGED_IN_ROUTING_KEY } from '../events/publisher.js';
import { recordLoginAttempt } from '../data/loginAuditRepository.js';
import { validateFullName, validatePassword } from './userService.js';

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const controlCharacters = /[\u0000-\u001F\u007F]/;

export async function registerUser({ email, password, fullName, role }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedRole = role === undefined ? 'student' : (typeof role === 'string' ? role.trim().toLowerCase() : '');

  if (!normalizedEmail || typeof password !== 'string' || !fullName) {
    return { status: 400, body: { code: 'MISSING_FIELDS', message: 'Email, password, and full name are required.' } };
  }
  if (normalizedRole !== 'student') {
    return { status: 403, body: { code: 'REGISTRATION_ROLE_FORBIDDEN', message: 'Public registration is available only for student accounts.' } };
  }
  if (normalizedEmail.length > 255 || controlCharacters.test(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { status: 400, body: { code: 'INVALID_EMAIL', message: 'Enter a valid email address.' } };
  }
  const nameValidation = validateFullName(fullName);
  if (nameValidation.error) return { status: 400, body: { code: 'INVALID_FULL_NAME', message: nameValidation.error } };
  const passwordValidation = validatePassword(password);
  if (passwordValidation.error) return { status: 400, body: { code: 'INVALID_PASSWORD', message: passwordValidation.error } };

  try {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(
        "INSERT INTO users (email, password_hash, full_name, role, status) VALUES (?, ?, ?, 'student', 'active')",
        [normalizedEmail, hashedPassword, nameValidation.value]
      );
      const [rows] = await connection.query(
        `SELECT id, email, full_name, role, status, created_at
         FROM users WHERE id = ?`,
        [result.insertId]
      );
      const user = rows[0];
      return {
        status: 201,
        body: { user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, status: user.status, createdAt: user.created_at } }
      };
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { status: 409, body: { code: 'ACCOUNT_ALREADY_EXISTS', message: 'An account with this email cannot be created.' } };
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
      const [rows] = await connection.query(
        'SELECT id, email, password_hash, full_name, role, status FROM users WHERE email = ? LIMIT 1',
        [normalizedEmail]
      );
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
      const res = { status: 403, body: { code: 'ACCOUNT_INACTIVE', message: 'This account is not active.' } };
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

    const loginTime = new Date().toISOString();
    const loginEventPublished = await publishEvent(
      USER_LOGGED_IN_ROUTING_KEY,
      createUserLoggedInEvent({ userId: user.id, role: user.role, loginTime })
    );
    if (!loginEventPublished) {
      console.warn('[AUTH] Login succeeded, but UserLoggedInEvent publication was unavailable.');
    }

    return {
      status: 200,
      body: {
        accessToken: token,
        userProfile: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          status: user.status
        },
        role: user.role
      }
    };
  } catch (error) {
    console.error('Error during authentication:', error);
    return { status: 500, body: { code: 'INTERNAL_ERROR', message: 'Failed to authenticate.' } };
  }
}

