namespace ExamService.DTOs
{
    public class SubmitQuizRequestDto
    {
        // Dictionary mapping QuestionId to SelectedAnswer
        public Dictionary<int, string> Answers { get; set; } = new Dictionary<int, string>();
    }
}
