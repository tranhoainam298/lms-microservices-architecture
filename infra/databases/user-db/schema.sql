-- SQL Schema for User DB
-- Owned by: User Service
-- This database stores user accounts, profiles, system roles, role assignments, and login audits.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'lms_user_db')
BEGIN
    CREATE DATABASE [lms_user_db];
END;
GO

USE [lms_user_db];
GO

-- 1. Users Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE [users] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [email] NVARCHAR(255) NOT NULL UNIQUE,
        [password_hash] NVARCHAR(255) NOT NULL,
        [full_name] NVARCHAR(255) NOT NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'active',
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_users_email' AND object_id = OBJECT_ID('users'))
BEGIN
    CREATE INDEX [idx_users_email] ON [users]([email]);
END;

-- 2. Roles Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='roles' AND xtype='U')
BEGIN
    CREATE TABLE [roles] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [role_name] NVARCHAR(100) NOT NULL UNIQUE,
        [description] NVARCHAR(255) NULL,
        [created_at] DATETIME2 DEFAULT GETDATE()
    );
END;

-- 3. User Roles Junction Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_roles' AND xtype='U')
BEGIN
    CREATE TABLE [user_roles] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NOT NULL,
        [role_id] BIGINT NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [uq_user_role] UNIQUE ([user_id], [role_id]),
        CONSTRAINT [fk_user_roles_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE CASCADE,
        CONSTRAINT [fk_user_roles_role] FOREIGN KEY ([role_id]) REFERENCES [roles] ([id]) ON DELETE CASCADE
    );
END;

-- 4. Login Audit Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='login_audit' AND xtype='U')
BEGIN
    CREATE TABLE [login_audit] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NULL,
        [login_status] NVARCHAR(50) NOT NULL, -- e.g., 'success', 'failed'
        [ip_address] NVARCHAR(45) NOT NULL,
        [user_agent] NVARCHAR(255) NULL,
        [occurred_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_login_audit_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([id]) ON DELETE SET NULL
    );
END;
