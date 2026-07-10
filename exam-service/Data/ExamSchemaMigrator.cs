using Microsoft.EntityFrameworkCore;

namespace ExamService.Data;

public static class ExamSchemaMigrator
{
    public static async Task MigrateAsync(ExamDbContext db)
    {
        var additions = new (string Table, string Column, string Definition)[]
        {
            ("quizzes", "InstructorId", "INT NOT NULL DEFAULT 0"),
            ("quizzes", "Description", "LONGTEXT NULL"),
            ("quizzes", "PassingScore", "INT NOT NULL DEFAULT 60"),
            ("quizzes", "Status", "VARCHAR(20) NOT NULL DEFAULT 'draft'"),
            ("quizzes", "CreatedAt", "DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)"),
            ("quizzes", "UpdatedAt", "DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)"),
            ("questions", "QuizId", "INT NULL"),
            ("questions", "Points", "DECIMAL(10,2) NOT NULL DEFAULT 1"),
            ("questions", "OrderIndex", "INT NOT NULL DEFAULT 1"),
            ("questions", "CreatedAt", "DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)"),
            ("quiz_results", "MaximumScore", "DECIMAL(10,2) NOT NULL DEFAULT 0"),
            ("quiz_results", "Percentage", "DECIMAL(5,2) NOT NULL DEFAULT 0"),
            ("quiz_results", "Passed", "TINYINT(1) NOT NULL DEFAULT 0"),
            ("quiz_results", "SubmittedAnswers", "JSON NULL")
        };
        foreach (var item in additions)
        {
            var exists = await db.Database.SqlQueryRaw<int>(
                "SELECT COUNT(*) AS Value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = {0} AND COLUMN_NAME = {1}",
                item.Table, item.Column).SingleAsync();
            if (exists == 0)
#pragma warning disable EF1002 // Table and column definitions come only from the fixed allowlist above.
                await db.Database.ExecuteSqlRawAsync($"ALTER TABLE `{item.Table}` ADD COLUMN `{item.Column}` {item.Definition}");
#pragma warning restore EF1002
        }

        await db.Database.ExecuteSqlRawAsync("UPDATE questions q JOIN quizzes z ON z.CourseId=q.CourseId SET q.QuizId=z.Id WHERE q.QuizId IS NULL");
        var questionFk = await db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) AS Value FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='questions' AND CONSTRAINT_NAME='FK_questions_quizzes_QuizId'").SingleAsync();
        if (questionFk == 0)
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE questions ADD CONSTRAINT FK_questions_quizzes_QuizId FOREIGN KEY (QuizId) REFERENCES quizzes(Id) ON DELETE CASCADE");
        var resultUnique = await db.Database.SqlQueryRaw<int>(
            "SELECT COUNT(*) AS Value FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='quiz_results' AND INDEX_NAME='UX_quiz_results_StudentId_QuizId'").SingleAsync();
        if (resultUnique == 0)
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE quiz_results ADD UNIQUE INDEX UX_quiz_results_StudentId_QuizId (StudentId, QuizId)");
    }
}
