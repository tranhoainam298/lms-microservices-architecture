-- SQL Schema for Exam DB
-- Owned by: Exam & Quiz Service
-- This database stores the question bank, quizzes, assignments, user quiz attempts, submitted answers, and grading results.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'lms_exam_db')
BEGIN
    CREATE DATABASE [lms_exam_db];
END;
GO

USE [lms_exam_db];
GO

-- 1. Question Bank Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='question_bank' AND xtype='U')
BEGIN
    CREATE TABLE [question_bank] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [course_id] BIGINT NOT NULL, -- Logical reference to Course Service (courses.id). No physical foreign key.
        [question_text] NVARCHAR(MAX) NOT NULL,
        [question_type] NVARCHAR(50) NOT NULL, -- e.g., 'single_choice', 'multiple_choice', 'true_false'
        [correct_answer] NVARCHAR(MAX) NOT NULL, -- Correct option(s) or answer key
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_questions_course' AND object_id = OBJECT_ID('question_bank'))
BEGIN
    CREATE INDEX [idx_questions_course] ON [question_bank]([course_id]);
END;

-- 2. Quizzes Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quizzes' AND xtype='U')
BEGIN
    CREATE TABLE [quizzes] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [course_id] BIGINT NOT NULL, -- Logical reference to Course Service (courses.id). No physical foreign key.
        [title] NVARCHAR(255) NOT NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'published', 'archived'
        [created_at] DATETIME2 DEFAULT GETDATE(),
        [updated_at] DATETIME2 DEFAULT GETDATE()
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_quizzes_course' AND object_id = OBJECT_ID('quizzes'))
BEGIN
    CREATE INDEX [idx_quizzes_course] ON [quizzes]([course_id]);
END;

-- 3. Quiz Questions Table (Junction Table)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quiz_questions' AND xtype='U')
BEGIN
    CREATE TABLE [quiz_questions] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [quiz_id] BIGINT NOT NULL,
        [question_id] BIGINT NOT NULL,
        [question_order] INT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [uq_quiz_question] UNIQUE ([quiz_id], [question_id]),
        CONSTRAINT [fk_quiz_questions_quiz] FOREIGN KEY ([quiz_id]) REFERENCES [quizzes] ([id]) ON DELETE CASCADE,
        CONSTRAINT [fk_quiz_questions_question] FOREIGN KEY ([question_id]) REFERENCES [question_bank] ([id]) ON DELETE CASCADE
    );
END;

-- 4. Quiz Attempts Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='quiz_attempts' AND xtype='U')
BEGIN
    CREATE TABLE [quiz_attempts] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [quiz_id] BIGINT NOT NULL,
        [user_id] BIGINT NOT NULL, -- Logical reference to User Service (users.id). No physical foreign key.
        [started_at] DATETIME2 DEFAULT GETDATE(),
        [submitted_at] DATETIME2 NULL,
        [status] NVARCHAR(50) NOT NULL DEFAULT 'in_progress', -- e.g., 'in_progress', 'submitted', 'graded'
        CONSTRAINT [fk_quiz_attempts_quiz] FOREIGN KEY ([quiz_id]) REFERENCES [quizzes] ([id]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_attempts_user' AND object_id = OBJECT_ID('quiz_attempts'))
BEGIN
    CREATE INDEX [idx_attempts_user] ON [quiz_attempts]([user_id]);
END;

-- 5. Submitted Answers Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='submitted_answers' AND xtype='U')
BEGIN
    CREATE TABLE [submitted_answers] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [attempt_id] BIGINT NOT NULL,
        [question_id] BIGINT NOT NULL,
        [submitted_answer] NVARCHAR(MAX) NOT NULL,
        [is_correct] BOOLEAN NOT NULL DEFAULT FALSE,
        [created_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [fk_submitted_answers_attempt] FOREIGN KEY ([attempt_id]) REFERENCES [quiz_attempts] ([id]) ON DELETE CASCADE,
        CONSTRAINT [fk_submitted_answers_question] FOREIGN KEY ([question_id]) REFERENCES [question_bank] ([id]) ON DELETE NO ACTION
    );
END;

-- 6. Grading Results Table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='grading_results' AND xtype='U')
BEGIN
    CREATE TABLE [grading_results] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [attempt_id] BIGINT NOT NULL,
        [score] INT NOT NULL,
        [max_score] INT NOT NULL,
        [passed] BOOLEAN NOT NULL DEFAULT FALSE,
        [graded_at] DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT [uq_attempt_grading] UNIQUE ([attempt_id]),
        CONSTRAINT [fk_grading_results_attempt] FOREIGN KEY ([attempt_id]) REFERENCES [quiz_attempts] ([id]) ON DELETE CASCADE
    );
END;
