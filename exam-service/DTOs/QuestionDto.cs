namespace ExamService.DTOs
{
    public class QuestionDto
    {
        public int Id { get; set; }
        public string Topic { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string Options { get; set; } = string.Empty;
    }
}
