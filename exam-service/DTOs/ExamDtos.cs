namespace ExamService.DTOs;

public record QuestionInput(string? QuestionText, string? QuestionType, List<string>? Options, int CorrectOptionIndex, decimal Points);
public record QuizInput(string? Title, string? Description, int DurationMinutes, int PassingScore, List<QuestionInput>? Questions);
public record AnswerInput(int QuestionId, int SelectedOptionIndex);
public record SubmitAnswersInput(List<AnswerInput>? Answers);
