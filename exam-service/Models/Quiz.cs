namespace ExamService.Models
{
    public class Quiz
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int TimeLimitMinutes { get; set; }
        
        // Navigation Property
        public ICollection<QuizResult> QuizResults { get; set; } = new List<QuizResult>();
    }
}
