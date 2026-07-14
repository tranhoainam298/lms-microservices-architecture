-- =============================================
-- LMS User Database - Schema & Seed Data
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  login_status VARCHAR(50) NOT NULL,
  failure_reason VARCHAR(255),
  ip_address VARCHAR(100),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed demo users (password: password123 - bcrypt hash)
-- Using bcrypt with 12 salt rounds
INSERT INTO users (id, email, password_hash, full_name, role, status) VALUES
  (1, 'student@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Nguyen Van An', 'student', 'active'),
  (2, 'instructor@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Tran Thi Bich', 'instructor', 'active'),
  (3, 'admin@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Le Van Cuong', 'admin', 'active'),
  (4, 'student2@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Pham Thi Dao', 'student', 'active'),
  (5, 'student3@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Hoang Van Em', 'student', 'active'),
  (6, 'instructor2@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Vo Thi Phuong', 'instructor', 'active'),
  (7, 'student4@lms.edu', '$2b$12$LJ3m4ys3GZfnMRqzOPMB3u8M5pxImnRYmABpOGFe9cNJxL3MZdmGG', 'Dang Van Giang', 'student', 'inactive')
ON DUPLICATE KEY UPDATE email=VALUES(email);