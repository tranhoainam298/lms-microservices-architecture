namespace ExamService.Models
{
    public class QuizResult
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public int QuizId { get; set; }
        public decimal Score { get; set; }
        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        // Navigation Property
        public Quiz Quiz { get; set; } = null!;
    }
}
