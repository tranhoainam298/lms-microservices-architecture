-- SQL Schema for Course DB
-- Owned by: Course Service
-- This database stores courses, lessons, active course access, learning progress, and AI learning contexts.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'lms_course_db')
BEGIN
    CREATE DATABASE [lms_course_db];
END;
GO

USE [lms_course_db];
GO

-- 1. Courses Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='courses' AND xtype='U')
BEGIN
    CREATE TABLE [courses] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [instructor_id] BIGINT NOT NULL, -- Logical reference to User Service (users.id). No physical foreign key.
        [title] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'published', 'archived'
        [price] DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_courses_instructor' AND object_id = OBJECT_ID('courses'))
BEGIN
    CREATE INDEX [idx_courses_instructor] ON [courses]([instructor_id]);
END;

-- 2. Lessons Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='lessons' AND xtype='U')
BEGIN
    CREATE TABLE [lessons] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [course_id] BIGINT NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [content_url] NVARCHAR(255) NULL,
        [lesson_order] INT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_lessons_course] FOREIGN KEY ([course_id]) REFERENCES [courses] ([id]) ON DELETE CASCADE
    );
END;

-- 3. Course Access Table (Enrollments)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='course_access' AND xtype='U')
BEGIN
    CREATE TABLE [course_access] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NOT NULL, -- Logical reference to User Service (users.id). No physical foreign key.
        [course_id] BIGINT NOT NULL,
        [access_status] NVARCHAR(50) NOT NULL DEFAULT 'active', -- e.g., 'active', 'expired', 'suspended'
        [activated_at] DATETIME2 NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [uq_user_course_access] UNIQUE ([user_id], [course_id]),
        CONSTRAINT [fk_course_access_course] FOREIGN KEY ([course_id]) REFERENCES [courses] ([id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_course_access_user' AND object_id = OBJECT_ID('course_access'))
BEGIN
    CREATE INDEX [idx_course_access_user] ON [course_access]([user_id]);
END;

-- 4. Learning Progress Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='learning_progress' AND xtype='U')
BEGIN
    CREATE TABLE [learning_progress] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [user_id] BIGINT NOT NULL, -- Logical reference to User Service (users.id). No physical foreign key.
        [course_id] BIGINT NOT NULL,
        [lesson_id] BIGINT NOT NULL,
        [progress_status] NVARCHAR(50) NOT NULL DEFAULT 'not_started', -- e.g., 'not_started', 'in_progress', 'completed'
        [completed_at] DATETIME2 NULL,
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [uq_user_lesson_progress] UNIQUE ([user_id], [lesson_id]),
        CONSTRAINT [fk_learning_progress_course] FOREIGN KEY ([course_id]) REFERENCES [courses] ([id]) ON DELETE CASCADE,
        CONSTRAINT [fk_learning_progress_lesson] FOREIGN KEY ([lesson_id]) REFERENCES [lessons] ([id]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_learning_progress_user' AND object_id = OBJECT_ID('learning_progress'))
BEGIN
    CREATE INDEX [idx_learning_progress_user] ON [learning_progress]([user_id]);
END;

-- 5. AI Learning Context Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ai_learning_context' AND xtype='U')
BEGIN
    CREATE TABLE [ai_learning_context] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [course_id] BIGINT NOT NULL,
        [lesson_id] BIGINT NULL, -- Nullable if context is course-wide
        [context_text] NVARCHAR(MAX) NOT NULL,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_ai_learning_context_course] FOREIGN KEY ([course_id]) REFERENCES [courses] ([id]) ON DELETE CASCADE,
        CONSTRAINT [fk_ai_learning_context_lesson] FOREIGN KEY ([lesson_id]) REFERENCES [lessons] ([id]) ON DELETE NO ACTION
    );
END;
