-- Deterministic historical demo ledger.
-- These rows are explicitly marked demo_seed and are not claimed as live ZaloPay payments.
-- Course prices are USD-like demo units; Payment Service converts them at 25,000 VND per unit.
-- Existing volumes must be seeded through seed-demo-data.bat so its read-only identity
-- collision checks complete across all four databases before this file can write.

SET @demo_seed_anchor = TIMESTAMP('2026-07-01 12:00:00');

START TRANSACTION;

INSERT INTO transactions
  (id, student_id, course_id, amount, status, gateway, gateway_transaction_id, created_at)
VALUES
  (40001, 9201, 20002, 799000, 'success', 'demo_seed', 'DEMO-SEED-0001', DATE_SUB(@demo_seed_anchor, INTERVAL 42 DAY)),
  (40002, 9201, 20003, 599000, 'success', 'demo_seed', 'DEMO-SEED-0002', DATE_SUB(@demo_seed_anchor, INTERVAL 38 DAY)),
  (40003, 9202, 20002, 799000, 'success', 'demo_seed', 'DEMO-SEED-0003', DATE_SUB(@demo_seed_anchor, INTERVAL 35 DAY)),
  (40004, 9202, 20004, 749000, 'success', 'demo_seed', 'DEMO-SEED-0004', DATE_SUB(@demo_seed_anchor, INTERVAL 32 DAY)),
  (40005, 9203, 20003, 599000, 'success', 'demo_seed', 'DEMO-SEED-0005', DATE_SUB(@demo_seed_anchor, INTERVAL 29 DAY)),
  (40006, 9203, 20005, 899000, 'success', 'demo_seed', 'DEMO-SEED-0006', DATE_SUB(@demo_seed_anchor, INTERVAL 27 DAY)),
  (40007, 9204, 20002, 799000, 'success', 'demo_seed', 'DEMO-SEED-0007', DATE_SUB(@demo_seed_anchor, INTERVAL 25 DAY)),
  (40008, 9204, 20004, 749000, 'success', 'demo_seed', 'DEMO-SEED-0008', DATE_SUB(@demo_seed_anchor, INTERVAL 23 DAY)),
  (40009, 9204, 20006, 649000, 'success', 'demo_seed', 'DEMO-SEED-0009', DATE_SUB(@demo_seed_anchor, INTERVAL 21 DAY)),
  (40010, 9205, 20005, 899000, 'success', 'demo_seed', 'DEMO-SEED-0010', DATE_SUB(@demo_seed_anchor, INTERVAL 19 DAY)),
  (40011, 9205, 20007, 999000, 'success', 'demo_seed', 'DEMO-SEED-0011', DATE_SUB(@demo_seed_anchor, INTERVAL 18 DAY)),
  (40012, 9206, 20003, 599000, 'success', 'demo_seed', 'DEMO-SEED-0012', DATE_SUB(@demo_seed_anchor, INTERVAL 17 DAY)),
  (40013, 9206, 20006, 649000, 'success', 'demo_seed', 'DEMO-SEED-0013', DATE_SUB(@demo_seed_anchor, INTERVAL 16 DAY)),
  (40014, 9206, 20008, 499000, 'success', 'demo_seed', 'DEMO-SEED-0014', DATE_SUB(@demo_seed_anchor, INTERVAL 15 DAY)),
  (40015, 9207, 20002, 799000, 'success', 'demo_seed', 'DEMO-SEED-0015', DATE_SUB(@demo_seed_anchor, INTERVAL 14 DAY)),
  (40016, 9207, 20007, 999000, 'success', 'demo_seed', 'DEMO-SEED-0016', DATE_SUB(@demo_seed_anchor, INTERVAL 13 DAY)),
  (40017, 9208, 20004, 749000, 'success', 'demo_seed', 'DEMO-SEED-0017', DATE_SUB(@demo_seed_anchor, INTERVAL 12 DAY)),
  (40018, 9208, 20008, 499000, 'success', 'demo_seed', 'DEMO-SEED-0018', DATE_SUB(@demo_seed_anchor, INTERVAL 11 DAY)),
  (40019, 9210, 20005, 899000, 'success', 'demo_seed', 'DEMO-SEED-0019', DATE_SUB(@demo_seed_anchor, INTERVAL 10 DAY)),
  (40020, 9210, 20006, 649000, 'success', 'demo_seed', 'DEMO-SEED-0020', DATE_SUB(@demo_seed_anchor, INTERVAL 9 DAY)),
  (40021, 9211, 20002, 799000, 'success', 'demo_seed', 'DEMO-SEED-0021', DATE_SUB(@demo_seed_anchor, INTERVAL 8 DAY)),
  (40022, 9211, 20003, 599000, 'success', 'demo_seed', 'DEMO-SEED-0022', DATE_SUB(@demo_seed_anchor, INTERVAL 7 DAY)),
  (40023, 9212, 20006, 649000, 'success', 'demo_seed', 'DEMO-SEED-0023', DATE_SUB(@demo_seed_anchor, INTERVAL 6 DAY)),
  (40024, 9212, 20007, 999000, 'success', 'demo_seed', 'DEMO-SEED-0024', DATE_SUB(@demo_seed_anchor, INTERVAL 5 DAY)),

  (40025, 9218, 20002, 799000, 'pending', 'demo_seed', 'DEMO-SEED-0025', DATE_SUB(@demo_seed_anchor, INTERVAL 4 DAY)),
  (40026, 9218, 20003, 599000, 'pending', 'demo_seed', 'DEMO-SEED-0026', DATE_SUB(@demo_seed_anchor, INTERVAL 3 DAY)),
  (40027, 9218, 20004, 749000, 'pending', 'demo_seed', 'DEMO-SEED-0027', DATE_SUB(@demo_seed_anchor, INTERVAL 2 DAY)),
  (40028, 9218, 20005, 899000, 'pending', 'demo_seed', 'DEMO-SEED-0028', DATE_SUB(@demo_seed_anchor, INTERVAL 1 DAY)),
  (40029, 9218, 20006, 649000, 'pending', 'demo_seed', 'DEMO-SEED-0029', DATE_SUB(@demo_seed_anchor, INTERVAL 12 HOUR)),
  (40030, 9218, 20007, 999000, 'pending', 'demo_seed', 'DEMO-SEED-0030', DATE_SUB(@demo_seed_anchor, INTERVAL 6 HOUR)),

  (40031, 9218, 20008, 499000, 'failed', 'demo_seed', 'DEMO-SEED-0031', DATE_SUB(@demo_seed_anchor, INTERVAL 20 DAY)),
  (40032, 9219, 20002, 799000, 'failed', 'demo_seed', 'DEMO-SEED-0032', DATE_SUB(@demo_seed_anchor, INTERVAL 16 DAY)),
  (40033, 9219, 20003, 599000, 'failed', 'demo_seed', 'DEMO-SEED-0033', DATE_SUB(@demo_seed_anchor, INTERVAL 12 DAY)),
  (40034, 9220, 20004, 749000, 'failed', 'demo_seed', 'DEMO-SEED-0034', DATE_SUB(@demo_seed_anchor, INTERVAL 8 DAY)),
  (40035, 9220, 20005, 899000, 'failed', 'demo_seed', 'DEMO-SEED-0035', DATE_SUB(@demo_seed_anchor, INTERVAL 4 DAY)),
  (40036, 9220, 20007, 999000, 'failed', 'demo_seed', 'DEMO-SEED-0036', DATE_SUB(@demo_seed_anchor, INTERVAL 2 DAY))
ON DUPLICATE KEY UPDATE
  student_id = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(student_id), transactions.student_id),
  course_id = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(course_id), transactions.course_id),
  amount = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(amount), transactions.amount),
  status = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(status), transactions.status),
  gateway = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(gateway), transactions.gateway),
  gateway_transaction_id = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(gateway_transaction_id), transactions.gateway_transaction_id),
  created_at = IF(transactions.id = VALUES(id) AND BINARY transactions.gateway_transaction_id = BINARY VALUES(gateway_transaction_id), VALUES(created_at), transactions.created_at);

COMMIT;
