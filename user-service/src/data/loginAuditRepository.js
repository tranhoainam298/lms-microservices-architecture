import { pool } from './database.js';

export async function recordLoginAttempt({
  userId,
  loginStatus,
  failureReason,
  ipAddress,
  userAgent
}) {
  const status = (loginStatus === 'success' || loginStatus === 'failed') ? loginStatus : 'failed';
  const resolvedUserId = userId || null;
  const resolvedFailureReason = status === 'success' ? null : (failureReason || null);
  const resolvedIpAddress = ipAddress || 'unknown';
  
  let resolvedUserAgent = null;
  if (typeof userAgent === 'string') {
    resolvedUserAgent = userAgent.slice(0, 500);
  }

  try {
    const query = `
      INSERT INTO login_audit
        (user_id, login_status, failure_reason, ip_address, user_agent)
      VALUES
        (?, ?, ?, ?, ?)
    `;
    const values = [resolvedUserId, status, resolvedFailureReason, resolvedIpAddress, resolvedUserAgent];
    await pool.query(query, values);
  } catch (error) {
    console.error('[AUDIT_ERROR] Failed to record login attempt:', error.message);
  }
}
