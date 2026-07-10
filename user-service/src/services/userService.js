import bcrypt from 'bcrypt';
import { pool } from '../data/database.js';

const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
const controlCharacters = /[\u0000-\u001F\u007F]/;

export function validateFullName(fullName) {
  if (typeof fullName !== 'string' || controlCharacters.test(fullName)) return { error: 'Enter a valid full name.' };
  const value = fullName.trim().replace(/\s+/gu, ' ');
  if (value.length < 2 || value.length > 255) {
    return { error: 'Enter a valid full name.' };
  }
  return { value };
}

export function validatePassword(password) {
  if (typeof password !== 'string'
    || password.length < 8
    || Buffer.byteLength(password, 'utf8') > 72
    || controlCharacters.test(password)
    || !/[A-Za-z]/.test(password)
    || !/\d/.test(password)) {
    return { error: 'Password must contain at least 8 characters, including a letter and a number.' };
  }
  return { value: password };
}

function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function selectPublicUser(connection, userId) {
  const [rows] = await connection.query(
    `SELECT id, email, full_name, role, status, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getOwnProfile(userId) {
  let connection;
  try {
    connection = await pool.getConnection();
    const user = await selectPublicUser(connection, userId);
    if (!user) return { status: 404, body: { code: 'USER_NOT_FOUND', message: 'The user account was not found.' } };
    if (user.status !== 'active') return { status: 403, body: { code: 'ACCOUNT_INACTIVE', message: 'This account is not active.' } };
    return { status: 200, body: { user: toPublicUser(user) } };
  } catch (error) {
    console.error('Profile lookup failed:', error.message);
    return { status: 500, body: { code: 'PROFILE_LOAD_FAILED', message: 'The profile could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateOwnProfile({ userId, fullName }) {
  const validation = validateFullName(fullName);
  if (validation.error) return { status: 400, body: { code: 'INVALID_FULL_NAME', message: validation.error } };
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(
      "UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'",
      [validation.value, userId]
    );
    const user = await selectPublicUser(connection, userId);
    if (!user) return { status: 404, body: { code: 'USER_NOT_FOUND', message: 'The user account was not found.' } };
    if (user.status !== 'active') return { status: 403, body: { code: 'ACCOUNT_INACTIVE', message: 'This account is not active.' } };
    return { status: 200, body: { user: toPublicUser(user) } };
  } catch (error) {
    console.error('Profile update failed:', error.message);
    return { status: 500, body: { code: 'PROFILE_UPDATE_FAILED', message: 'The profile could not be updated.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function changeOwnPassword({ userId, currentPassword, newPassword }) {
  if (typeof currentPassword !== 'string') {
    return { status: 401, body: { code: 'CURRENT_PASSWORD_INVALID', message: 'The current password is incorrect.' } };
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(
      'SELECT id, password_hash, status FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (rows.length === 0) return { status: 404, body: { code: 'USER_NOT_FOUND', message: 'The user account was not found.' } };
    const user = rows[0];
    if (user.status !== 'active') return { status: 403, body: { code: 'ACCOUNT_INACTIVE', message: 'This account is not active.' } };
    if (!await bcrypt.compare(currentPassword, user.password_hash)) {
      return { status: 401, body: { code: 'CURRENT_PASSWORD_INVALID', message: 'The current password is incorrect.' } };
    }
    const validation = validatePassword(newPassword);
    if (validation.error) return { status: 400, body: { code: 'INVALID_PASSWORD', message: validation.error } };
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      return { status: 400, body: { code: 'PASSWORD_REUSE_NOT_ALLOWED', message: 'The new password must be different from the current password.' } };
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await connection.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
    return { status: 200, body: { changed: true, message: 'Password changed successfully.' } };
  } catch (error) {
    console.error('Password change failed:', error.message);
    return { status: 500, body: { code: 'PASSWORD_CHANGE_FAILED', message: 'The password could not be changed.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function listUsers({ page, pageSize, role, status, search }) {
  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedPageSize = pageSize === undefined ? 20 : Number(pageSize);
  if (!Number.isSafeInteger(parsedPage) || parsedPage < 1 || !Number.isSafeInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
    return { status: 400, body: { code: 'INVALID_PAGINATION', message: 'Page and pageSize must be valid positive integers.' } };
  }
  if (role && !['student', 'instructor', 'admin'].includes(role)) {
    return { status: 400, body: { code: 'INVALID_ROLE', message: 'Role filter is invalid.' } };
  }
  if (status && !['active', 'inactive'].includes(status)) {
    return { status: 400, body: { code: 'INVALID_STATUS', message: 'Status filter is invalid.' } };
  }
  if (search !== undefined && (typeof search !== 'string' || search.length > 100 || controlCharacters.test(search))) {
    return { status: 400, body: { code: 'INVALID_SEARCH', message: 'Search filter is invalid.' } };
  }

  const conditions = [];
  const values = [];
  if (role) { conditions.push('role = ?'); values.push(role); }
  if (status) { conditions.push('status = ?'); values.push(status); }
  const normalizedSearch = typeof search === 'string' ? search.trim() : '';
  if (normalizedSearch) {
    conditions.push('(email LIKE ? OR full_name LIKE ?)');
    const term = `%${normalizedSearch}%`;
    values.push(term, term);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  let connection;
  try {
    connection = await pool.getConnection();
    const [countRows] = await connection.query(`SELECT COUNT(*) AS total FROM users ${where}`, values);
    const offset = (parsedPage - 1) * parsedPageSize;
    const [rows] = await connection.query(
      `SELECT id, email, full_name, role, status, created_at, updated_at
       FROM users ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...values, parsedPageSize, offset]
    );
    return { status: 200, body: { items: rows.map(toPublicUser), total: countRows[0].total, page: parsedPage, pageSize: parsedPageSize } };
  } catch (error) {
    console.error('Admin user listing failed:', error.message);
    return { status: 500, body: { code: 'USER_LIST_FAILED', message: 'User accounts could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateUserStatus({ adminId, userId, status }) {
  if (!['active', 'inactive'].includes(status)) {
    return { status: 400, body: { code: 'INVALID_STATUS', message: 'Status must be active or inactive.' } };
  }
  if (adminId === userId && status === 'inactive') {
    return { status: 409, body: { code: 'SELF_DEACTIVATION_FORBIDDEN', message: 'You cannot deactivate your own administrator account.' } };
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(
      'UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, userId]
    );
    const user = await selectPublicUser(connection, userId);
    if (!user) return { status: 404, body: { code: 'USER_NOT_FOUND', message: 'The user account was not found.' } };
    return { status: 200, body: { user: toPublicUser(user) } };
  } catch (error) {
    console.error('User status update failed:', error.message);
    return { status: 500, body: { code: 'USER_STATUS_UPDATE_FAILED', message: 'The account status could not be updated.' } };
  } finally {
    if (connection) connection.release();
  }
}
