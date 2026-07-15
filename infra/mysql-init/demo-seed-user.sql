-- Deterministic local-demo data. Safe to run repeatedly.
-- Password for these demo-only accounts is documented in docs/demo/DEMO_ACCOUNTS.md.
-- The bcrypt hash was generated with the User Service production setting of 12 rounds.
-- Existing volumes must be seeded through seed-demo-data.bat so its read-only identity
-- collision checks complete across all four databases before this file can write.

SET @demo_seed_anchor = TIMESTAMP('2026-07-01 12:00:00');

START TRANSACTION;

INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  (9001, 'admin@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Minh Anh Nguyen', 'admin', 'active'),
  (9002, 'admin2@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Bao Chau Tran', 'admin', 'active'),
  (9101, 'instructor1@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Khanh Linh Pham', 'instructor', 'active'),
  (9102, 'instructor2@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Quang Huy Le', 'instructor', 'active'),
  (9103, 'instructor3@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Thao Nguyen Vu', 'instructor', 'active'),
  (9104, 'instructor4@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Duc Anh Hoang', 'instructor', 'active'),
  (9105, 'instructor5@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Mai Phuong Do', 'instructor', 'inactive'),
  (9201, 'student1@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Gia Bao Nguyen', 'student', 'active'),
  (9202, 'student2@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Hoai An Tran', 'student', 'active'),
  (9203, 'student3@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Minh Khoa Le', 'student', 'active'),
  (9204, 'student4@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Ngoc Ha Pham', 'student', 'active'),
  (9205, 'student5@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Tuan Kiet Vo', 'student', 'active'),
  (9206, 'student6@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Thanh Truc Bui', 'student', 'active'),
  (9207, 'student7@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Quoc Viet Dang', 'student', 'active'),
  (9208, 'student8@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Lan Chi Ho', 'student', 'active'),
  (9209, 'student9@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Hai Nam Ngo', 'student', 'active'),
  (9210, 'student10@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'My Duyen Duong', 'student', 'active'),
  (9211, 'student11@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Nhat Minh Truong', 'student', 'active'),
  (9212, 'student12@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Thu Uyen Ly', 'student', 'active'),
  (9213, 'student13@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Tien Dat Phan', 'student', 'active'),
  (9214, 'student14@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Yen Nhi Dinh', 'student', 'active'),
  (9215, 'student15@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Anh Quan Huynh', 'student', 'active'),
  (9216, 'student16@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Tuong Vy Cao', 'student', 'active'),
  (9217, 'student17@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Phuc Long Lam', 'student', 'active'),
  (9218, 'student18@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Bao Ngoc Mai', 'student', 'active'),
  (9219, 'student19@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Duy Khang Ta', 'student', 'inactive'),
  (9220, 'student20@lms.demo', '$2b$12$uQ098g0Gl4b1e/4LFfmi/.lOliHCPhdg5.4rAU57lQRCPofpl/poG', 'Kim Ngan Chau', 'student', 'inactive')
ON DUPLICATE KEY UPDATE
  email = IF(users.id = VALUES(id) AND BINARY users.email = BINARY VALUES(email), VALUES(email), users.email),
  password_hash = IF(users.id = VALUES(id) AND BINARY users.email = BINARY VALUES(email), VALUES(password_hash), users.password_hash),
  full_name = IF(users.id = VALUES(id) AND BINARY users.email = BINARY VALUES(email), VALUES(full_name), users.full_name),
  role = IF(users.id = VALUES(id) AND BINARY users.email = BINARY VALUES(email), VALUES(role), users.role),
  status = IF(users.id = VALUES(id) AND BINARY users.email = BINARY VALUES(email), VALUES(status), users.status);

-- Three deterministic audit rows per demo user keep activity reporting meaningful.
INSERT INTO login_audit
  (id, user_id, login_status, failure_reason, ip_address, user_agent, occurred_at)
SELECT
  95000 + (u.seq * 10) + a.attempt_no,
  u.user_id,
  CASE WHEN a.attempt_no = 3 AND MOD(u.seq, 4) = 0 THEN 'failed' ELSE 'success' END,
  CASE WHEN a.attempt_no = 3 AND MOD(u.seq, 4) = 0 THEN 'invalid_password' ELSE NULL END,
  CONCAT('192.0.2.', 10 + u.seq),
  'LMS demo browser',
  DATE_SUB(@demo_seed_anchor, INTERVAL (u.seq + a.attempt_no) DAY)
FROM (
  SELECT 1 seq, 9001 user_id UNION ALL SELECT 2, 9002
  UNION ALL SELECT 3, 9101 UNION ALL SELECT 4, 9102 UNION ALL SELECT 5, 9103
  UNION ALL SELECT 6, 9104 UNION ALL SELECT 7, 9105
  UNION ALL SELECT 8, 9201 UNION ALL SELECT 9, 9202 UNION ALL SELECT 10, 9203
  UNION ALL SELECT 11, 9204 UNION ALL SELECT 12, 9205 UNION ALL SELECT 13, 9206
  UNION ALL SELECT 14, 9207 UNION ALL SELECT 15, 9208 UNION ALL SELECT 16, 9209
  UNION ALL SELECT 17, 9210 UNION ALL SELECT 18, 9211 UNION ALL SELECT 19, 9212
  UNION ALL SELECT 20, 9213 UNION ALL SELECT 21, 9214 UNION ALL SELECT 22, 9215
  UNION ALL SELECT 23, 9216 UNION ALL SELECT 24, 9217 UNION ALL SELECT 25, 9218
  UNION ALL SELECT 26, 9219 UNION ALL SELECT 27, 9220
) u
CROSS JOIN (
  SELECT 1 attempt_no UNION ALL SELECT 2 UNION ALL SELECT 3
) a
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  user_id = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(user_id), login_audit.user_id),
  login_status = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(login_status), login_audit.login_status),
  failure_reason = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(failure_reason), login_audit.failure_reason),
  ip_address = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(ip_address), login_audit.ip_address),
  user_agent = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(user_agent), login_audit.user_agent),
  occurred_at = IF(login_audit.id = VALUES(id) AND login_audit.user_id = VALUES(user_id), VALUES(occurred_at), login_audit.occurred_at);

COMMIT;
