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

export async function updateUserRole({ adminId, userId, role }) {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
  if (!['student', 'instructor', 'admin'].includes(normalizedRole)) {
    return { status: 400, body: { code: 'INVALID_ROLE', message: 'Role must be student, instructor, or admin.' } };
  }
  if (adminId === userId) {
    return { status: 409, body: { code: 'SELF_ROLE_CHANGE_FORBIDDEN', message: 'You cannot change your own administrator role.' } };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [updateResult] = await connection.query(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [normalizedRole, userId]
    );
    if (updateResult.affectedRows === 0) {
      return { status: 404, body: { code: 'USER_NOT_FOUND', message: 'The user account was not found.' } };
    }
    const user = await selectPublicUser(connection, userId);
    return { status: 200, body: { user: toPublicUser(user) } };
  } catch (error) {
    console.error('User role update failed:', error.message);
    return { status: 500, body: { code: 'USER_ROLE_UPDATE_FAILED', message: 'The account role could not be updated.' } };
  } finally {
    if (connection) connection.release();
  }
}

function parseReportDate(value, endOfDay = false) {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'Dates must use YYYY-MM-DD format.' };
  }
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { error: 'Dates must be valid calendar dates.' };
  }
  return { value: date };
}

export async function getLoginActivityReport({ page, pageSize, status, dateFrom, dateTo }) {
  const parsedPage = page === undefined ? 1 : Number(page);
  const parsedPageSize = pageSize === undefined ? 25 : Number(pageSize);
  if (!Number.isSafeInteger(parsedPage) || parsedPage < 1
    || !Number.isSafeInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
    return { status: 400, body: { code: 'INVALID_PAGINATION', message: 'Page and pageSize must be valid positive integers.' } };
  }
  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (normalizedStatus && !['success', 'failed'].includes(normalizedStatus)) {
    return { status: 400, body: { code: 'INVALID_STATUS', message: 'Login status must be success or failed.' } };
  }
  const from = parseReportDate(dateFrom);
  const to = parseReportDate(dateTo, true);
  if (from.error || to.error) {
    return { status: 400, body: { code: 'INVALID_DATE_RANGE', message: from.error || to.error } };
  }
  if (from.value && to.value && from.value > to.value) {
    return { status: 400, body: { code: 'INVALID_DATE_RANGE', message: 'dateFrom cannot be after dateTo.' } };
  }

  const conditions = [];
  const values = [];
  if (normalizedStatus) { conditions.push('a.login_status = ?'); values.push(normalizedStatus); }
  if (from.value) { conditions.push('a.occurred_at >= ?'); values.push(from.value); }
  if (to.value) { conditions.push('a.occurred_at <= ?'); values.push(to.value); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  let connection;
  try {
    connection = await pool.getConnection();
    const [summaryRows] = await connection.query(
      `SELECT COUNT(*) AS total_attempts,
              SUM(CASE WHEN a.login_status = 'success' THEN 1 ELSE 0 END) AS successful_logins,
              SUM(CASE WHEN a.login_status = 'failed' THEN 1 ELSE 0 END) AS failed_logins,
              COUNT(DISTINCT CASE WHEN a.login_status = 'success' THEN a.user_id END) AS active_users
       FROM login_audit a ${where}`,
      values
    );
    const offset = (parsedPage - 1) * parsedPageSize;
    const [rows] = await connection.query(
      `SELECT a.id, a.user_id, a.login_status, a.failure_reason, a.occurred_at,
              u.email, u.full_name, u.role
       FROM login_audit a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.occurred_at DESC, a.id DESC
       LIMIT ? OFFSET ?`,
      [...values, parsedPageSize, offset]
    );
    const summary = summaryRows[0];
    return {
      status: 200,
      body: {
        summary: {
          totalAttempts: Number(summary.total_attempts || 0),
          successfulLogins: Number(summary.successful_logins || 0),
          failedLogins: Number(summary.failed_logins || 0),
          activeUsers: Number(summary.active_users || 0)
        },
        items: rows.map(row => ({
          id: row.id,
          userId: row.user_id,
          email: row.email || null,
          fullName: row.full_name || null,
          role: row.role || null,
          status: row.login_status,
          failureReason: row.failure_reason,
          occurredAt: row.occurred_at
        })),
        page: parsedPage,
        pageSize: parsedPageSize,
        total: Number(summary.total_attempts || 0)
      }
    };
  } catch (error) {
    console.error('Login activity report failed:', error.message);
    return { status: 500, body: { code: 'ACTIVITY_REPORT_FAILED', message: 'Login activity could not be loaded.' } };
  } finally {
    if (connection) connection.release();
  }
}
