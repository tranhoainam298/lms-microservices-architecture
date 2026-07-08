-- SQL Schema for Payment DB
-- Owned by: Payment Service
-- This database stores payment requests, gateway transaction records, raw gateway payloads, and recognized revenue logs.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'lms_payment_db')
BEGIN
    CREATE DATABASE [lms_payment_db];
END;
GO

USE [lms_payment_db];
GO

-- 1. Payments Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='payments' AND xtype='U')
BEGIN
    CREATE TABLE [payments] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NOT NULL, -- Logical reference to User Service (users.id). No physical foreign key.
        [course_id] BIGINT NOT NULL, -- Logical reference to Course Service (courses.id). No physical foreign key.
        [amount] DECIMAL(10, 2) NOT NULL,
        [payment_method] NVARCHAR(50) NOT NULL, -- e.g., 'momo', 'zalopay'
        [payment_status] NVARCHAR(50) NOT NULL DEFAULT 'pending', -- e.g., 'pending', 'completed', 'failed', 'refunded'
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payments_user' AND object_id = OBJECT_ID('payments'))
BEGIN
    CREATE INDEX [idx_payments_user] ON [payments]([user_id]);
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_payments_course' AND object_id = OBJECT_ID('payments'))
BEGIN
    CREATE INDEX [idx_payments_course] ON [payments]([course_id]);
END;

-- 2. Payment Transactions Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='payment_transactions' AND xtype='U')
BEGIN
    CREATE TABLE [payment_transactions] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [payment_id] BIGINT NOT NULL,
        [gateway_transaction_id] NVARCHAR(255) NOT NULL UNIQUE,
        [transaction_status] NVARCHAR(50) NOT NULL, -- e.g., 'initiated', 'success', 'failed'
        [requested_at] DATETIME2 DEFAULT GETDATE(),
        [completed_at] DATETIME2 NULL,
        CONSTRAINT [fk_payment_transactions_payment] FOREIGN KEY ([payment_id]) REFERENCES [payments] ([id]) ON DELETE CASCADE
    );
END;

-- 3. Payment Gateway Logs Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='payment_gateway_logs' AND xtype='U')
BEGIN
    CREATE TABLE [payment_gateway_logs] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [payment_id] BIGINT NULL,
        [gateway_name] NVARCHAR(50) NOT NULL, -- e.g., 'momo', 'zalopay'
        [request_payload] NVARCHAR(MAX) NULL,
        [response_payload] NVARCHAR(MAX) NULL,
        [status] NVARCHAR(50) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_payment_gateway_logs_payment] FOREIGN KEY ([payment_id]) REFERENCES [payments] ([id]) ON DELETE SET NULL
    );
END;

-- 4. Revenue Records Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='revenue_records' AND xtype='U')
BEGIN
    CREATE TABLE [revenue_records] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [payment_id] BIGINT NOT NULL,
        [course_id] BIGINT NOT NULL, -- Logical reference to Course Service (courses.id). No physical foreign key.
        [amount] DECIMAL(10, 2) NOT NULL,
        [recorded_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_revenue_records_payment] FOREIGN KEY ([payment_id]) REFERENCES [payments] ([id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_revenue_course' AND object_id = OBJECT_ID('revenue_records'))
BEGIN
    CREATE INDEX [idx_revenue_course] ON [revenue_records]([course_id]);
END;
