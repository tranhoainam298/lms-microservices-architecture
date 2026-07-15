-- =============================================
-- LMS Payment Database - Schema & Seed Data
-- =============================================

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  gateway VARCHAR(50) DEFAULT 'zalopay',
  gateway_transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id),
  INDEX idx_course_id (course_id),
  INDEX idx_status (status),
  INDEX idx_gateway_trans_id (gateway_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Seed Data: Sample completed transactions
-- =============================================
INSERT INTO transactions (id, student_id, course_id, amount, status, gateway, gateway_transaction_id, created_at) VALUES
  (1, 1, 1, 299000, 'success', 'zalopay', 'ZP250601_000001', '2025-05-15 10:30:00'),
  (2, 1, 2, 499000, 'success', 'zalopay', 'ZP250601_000002', '2025-05-20 14:00:00'),
  (3, 1, 6, 249000, 'success', 'zalopay', 'ZP250601_000003', '2025-06-01 09:15:00'),
  (4, 4, 1, 299000, 'success', 'zalopay', 'ZP250602_000001', '2025-05-18 11:00:00'),
  (5, 4, 3, 349000, 'success', 'zalopay', 'ZP250602_000002', '2025-05-25 16:30:00'),
  (6, 4, 4, 599000, 'success', 'zalopay', 'ZP250602_000003', '2025-06-03 08:45:00'),
  (7, 5, 2, 499000, 'success', 'zalopay', 'ZP250603_000001', '2025-05-22 13:20:00'),
  (8, 5, 5, 699000, 'success', 'zalopay', 'ZP250603_000002', '2025-06-05 10:00:00'),
  (9, 1, 4, 599000, 'failed', 'zalopay', 'ZP250604_000001', '2025-06-10 15:30:00'),
  (10, 4, 5, 699000, 'pending', 'zalopay', NULL, '2025-06-12 09:00:00')
ON DUPLICATE KEY UPDATE status=VALUES(status);