using ExamService.Data;
using ExamService.DTOs;
using ExamService.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ExamService.Controllers
{
    [ApiController]
    [Route("quizzes")]
    public class QuizController : ControllerBase
    {
        private readonly ExamDbContext _context;

        public QuizController(ExamDbContext context)
        {
            _context = context;
        }

        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new { message = "Exam Service is up and running!" });
        }

        // 1. POST /quizzes: Create a new quiz
        [HttpPost]
        public async Task<IActionResult> CreateQuiz([FromBody] Quiz quiz)
        {
            if (quiz == null)
                return BadRequest("Invalid quiz data.");

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetQuiz), new { id = quiz.Id }, quiz);
        }

        // 2. POST /questions: Add a question (Instructor only)
        [HttpPost("~/questions")]
        public async Task<IActionResult> CreateQuestion([FromBody] Question question)
        {
            if (question == null)
                return BadRequest("Invalid question data.");

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Question created successfully", questionId = question.Id });
        }

        // 3. GET /quizzes/{id}: Fetch the quiz and its questions
        [HttpGet("{id}")]
        public async Task<IActionResult> GetQuiz(int id)
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null)
                return NotFound("Quiz not found.");

            // Fetch questions for the course this quiz belongs to
            var questions = await _context.Questions
                .Where(q => q.CourseId == quiz.CourseId)
                .Select(q => new QuestionDto
                {
                    Id = q.Id,
                    Topic = q.Topic,
                    Content = q.Content,
                    Options = q.Options
                })
                .ToListAsync();

            var result = new QuizDetailDto
            {
                Id = quiz.Id,
                CourseId = quiz.CourseId,
                Title = quiz.Title,
                TimeLimitMinutes = quiz.TimeLimitMinutes,
                Questions = questions
            };

            return Ok(result);
        }

        // 4. POST /quizzes/{id}/submit: The Auto-Grading Engine
        [HttpPost("{id}/submit")]
        public async Task<IActionResult> SubmitQuiz(int id, [FromBody] SubmitQuizRequestDto request)
        {
            var quiz = await _context.Quizzes.FindAsync(id);
            if (quiz == null)
                return NotFound("Quiz not found.");

            // Fetch all questions for the course
            var questions = await _context.Questions
                .Where(q => q.CourseId == quiz.CourseId)
                .ToListAsync();

            if (!questions.Any())
                return BadRequest("No questions found for this quiz.");

            int correctCount = 0;
            int totalCount = questions.Count;

            // Auto-Grading Logic
            foreach (var question in questions)
            {
                if (request.Answers.TryGetValue(question.Id, out var studentAnswer))
                {
                    // Case-insensitive comparison (assuming answers might differ in case)
                    if (string.Equals(question.CorrectAnswer.Trim(), studentAnswer.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        correctCount++;
                    }
                }
            }

            // Calculate score (Scale 100)
            decimal score = Math.Round((decimal)correctCount / totalCount * 100, 2);

            // Save result
            var quizResult = new QuizResult
            {
                StudentId = request.StudentId,
                QuizId = quiz.Id,
                Score = score,
                SubmittedAt = DateTime.UtcNow
            };

            _context.QuizResults.Add(quizResult);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Quiz submitted successfully.",
                score = score,
                correctAnswers = correctCount,
                totalQuestions = totalCount,
                quizResultId = quizResult.Id
            });
        }
    }
}
