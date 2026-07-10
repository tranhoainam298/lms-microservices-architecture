namespace ExamService.DTOs
{
    public class SubmitQuizRequestDto
    {
        public int StudentId { get; set; }
        
        // Dictionary mapping QuestionId to SelectedAnswer
        public Dictionary<int, string> Answers { get; set; } = new Dictionary<int, string>();
    }
}
