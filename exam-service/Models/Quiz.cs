namespace ExamService.Models
{
    public class Quiz
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public int InstructorId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int TimeLimitMinutes { get; set; }
        public int PassingScore { get; set; }
        public string Status { get; set; } = "draft";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ICollection<Question> Questions { get; set; } = new List<Question>();
        
        // Navigation Property
        public ICollection<QuizResult> QuizResults { get; set; } = new List<QuizResult>();
    }
}
