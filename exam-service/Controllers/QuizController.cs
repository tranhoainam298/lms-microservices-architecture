using System.Security.Claims;
using System.Text.Json;
using ExamService.Data;
using ExamService.DTOs;
using ExamService.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace ExamService.Controllers;

[ApiController, Route("exams")]
public class QuizController(ExamDbContext db, IHttpClientFactory clients) : ControllerBase
{
    private enum CourseAccessState { Allowed, Denied, Unavailable }
    private int UserId => int.TryParse(User.FindFirstValue("id") ?? User.FindFirstValue("sub"), out var id) ? id : 0;
    private string Role => (User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? "").ToLowerInvariant();
    private IActionResult Forbidden(string message) => StatusCode(403, new { code = "FORBIDDEN", message });
    private static bool Id(string value, out int id) => int.TryParse(value, out id) && id > 0 && value.All(char.IsAsciiDigit) && value[0] != '0';

    private async Task<bool?> OwnsDraft(int courseId)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/courses/drafts/mine");
            request.Headers.TryAddWithoutValidation("Authorization", Request.Headers.Authorization.ToString());
            var response = await clients.CreateClient("CourseService").SendAsync(request);
            if (!response.IsSuccessStatusCode) return response.StatusCode == System.Net.HttpStatusCode.NotFound ? false : null;
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var items = json.RootElement.TryGetProperty("items", out var list) ? list : json.RootElement;
            return items.ValueKind == JsonValueKind.Array && items.EnumerateArray().Any(x => x.GetProperty("id").GetInt32() == courseId);
        }
        catch { return null; }
    }

    private async Task<bool?> OwnsCourse(int courseId)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/courses/{courseId}/instructor-access");
            request.Headers.TryAddWithoutValidation("Authorization", Request.Headers.Authorization.ToString());
            var response = await clients.CreateClient("CourseService").SendAsync(request);
            if (response.IsSuccessStatusCode) return true;
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return false;
            return null;
        }
        catch { return null; }
    }

    private async Task<CourseAccessState> StudentCourseAccess(int courseId)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"/courses/{courseId}/student-exam-access");
            request.Headers.TryAddWithoutValidation("Authorization", Request.Headers.Authorization.ToString());
            var response = await clients.CreateClient("CourseService").SendAsync(request);
            if (response.IsSuccessStatusCode) return CourseAccessState.Allowed;
            if (response.StatusCode == System.Net.HttpStatusCode.Forbidden) return CourseAccessState.Denied;
            return CourseAccessState.Unavailable;
        }
        catch { return CourseAccessState.Unavailable; }
    }

    private IActionResult? CourseAccessFailure(CourseAccessState access) => access switch
    {
        CourseAccessState.Denied => StatusCode(403, new { code="COURSE_ACCESS_REQUIRED", message="You must be enrolled in a published course to access its exams." }),
        CourseAccessState.Unavailable => StatusCode(502, new { code="COURSE_SERVICE_UNAVAILABLE", message="Course Service is unavailable." }),
        _ => null
    };

    private IActionResult? ValidateQuiz(QuizInput input)
    {
        var title = input.Title?.Trim();
        if (title is null || title.Length < 3 || title.Length > 255) return BadRequest(new { code = "VALIDATION_ERROR", message = "Quiz title must contain 3 to 255 characters." });
        if (input.Description?.Trim().Length > 4000) return BadRequest(new { code = "VALIDATION_ERROR", message = "Quiz description is too long." });
        if (input.DurationMinutes is < 1 or > 300) return BadRequest(new { code = "VALIDATION_ERROR", message = "Duration must be between 1 and 300 minutes." });
        if (input.PassingScore is < 0 or > 100) return BadRequest(new { code = "VALIDATION_ERROR", message = "Passing score must be between 0 and 100." });
        if (input.Questions is null || input.Questions.Count is < 1 or > 100) return BadRequest(new { code = "VALIDATION_ERROR", message = "A quiz must contain between 1 and 100 questions." });
        foreach (var q in input.Questions)
        {
            if (string.IsNullOrWhiteSpace(q.QuestionText) || q.QuestionText.Trim().Length > 4000 || q.QuestionType != "single_choice") return BadRequest(new { code = "VALIDATION_ERROR", message = "Each question must be a valid single-choice question." });
            if (q.Options is null || q.Options.Count is < 2 or > 6 || q.Options.Any(o => string.IsNullOrWhiteSpace(o) || o.Trim().Length > 1000)) return BadRequest(new { code = "VALIDATION_ERROR", message = "Each question must have 2 to 6 nonempty options." });
            if (q.CorrectOptionIndex < 0 || q.CorrectOptionIndex >= q.Options.Count || q.Points is <= 0 or > 100) return BadRequest(new { code = "VALIDATION_ERROR", message = "Each question needs a valid correct option and points between 0 and 100." });
        }
        return null;
    }

    private object Summary(Quiz q) => new { id=q.Id, courseId=q.CourseId, title=q.Title, description=q.Description, durationMinutes=q.TimeLimitMinutes, passingScore=q.PassingScore, status=q.Status, instructorId=q.InstructorId, questionCount=q.Questions.Count, createdAt=q.CreatedAt, updatedAt=q.UpdatedAt };
    private static Question BuildQuestion(QuestionInput q, int courseId, int order) => new() { CourseId=courseId, Topic="single_choice", Content=q.QuestionText!.Trim(), Options=JsonSerializer.Serialize(q.Options!.Select(x=>x.Trim())), CorrectAnswer=q.CorrectOptionIndex.ToString(), Difficulty="medium", Points=q.Points, OrderIndex=order, CreatedAt=DateTime.UtcNow };
    private static int? CorrectOptionIndex(Question question)
    {
        if (int.TryParse(question.CorrectAnswer, out var storedIndex)) return storedIndex;
        var options = JsonSerializer.Deserialize<List<string>>(question.Options) ?? [];
        var legacyIndex = options.FindIndex(option => option == question.CorrectAnswer);
        return legacyIndex >= 0 ? legacyIndex : null;
    }

    private static bool IsDuplicateKey(DbUpdateException exception)
    {
        Exception? current = exception;
        while (current is not null)
        {
            if (current is MySqlException { Number: 1062 }) return true;
            current = current.InnerException;
        }

        return false;
    }

    [HttpPost("courses/{courseId}/quizzes")]
    public async Task<IActionResult> Create(string courseId, QuizInput input)
    {
        if (Role != "instructor") return Forbidden("Only instructors can manage quizzes.");
        if (!Id(courseId, out var cid)) return BadRequest(new { code="INVALID_COURSE_ID", message="Course ID must be a positive integer." });
        var owns=await OwnsDraft(cid); if (owns is null) return StatusCode(502,new{code="COURSE_SERVICE_UNAVAILABLE",message="Course Service is unavailable."}); if (!owns.Value) return NotFound(new{code="DRAFT_NOT_FOUND",message="The draft course was not found."});
        if (ValidateQuiz(input) is IActionResult error) return error;
        await using var tx=await db.Database.BeginTransactionAsync();
        var quiz=new Quiz{CourseId=cid,InstructorId=UserId,Title=input.Title!.Trim(),Description=input.Description?.Trim(),TimeLimitMinutes=input.DurationMinutes,PassingScore=input.PassingScore,Status="draft",CreatedAt=DateTime.UtcNow,UpdatedAt=DateTime.UtcNow};
        for(var i=0;i<input.Questions!.Count;i++) quiz.Questions.Add(BuildQuestion(input.Questions[i],cid,i+1));
        db.Quizzes.Add(quiz); await db.SaveChangesAsync(); await tx.CommitAsync();
        return StatusCode(201,new{quiz=Summary(quiz)});
    }

    [HttpGet("courses/{courseId}/quizzes/mine")]
    public async Task<IActionResult> Mine(string courseId)
    {
        if(Role!="instructor") return Forbidden("Only instructors can manage quizzes."); if(!Id(courseId,out var cid)) return BadRequest(new{code="INVALID_COURSE_ID",message="Course ID must be a positive integer."});
        var owns=await OwnsDraft(cid); if(owns is null)return StatusCode(502,new{code="COURSE_SERVICE_UNAVAILABLE",message="Course Service is unavailable."}); if(!owns.Value)return NotFound(new{code="DRAFT_NOT_FOUND",message="The draft course was not found."});
        var items=await db.Quizzes.AsNoTracking().Include(x=>x.Questions).Where(x=>x.CourseId==cid&&x.InstructorId==UserId).OrderByDescending(x=>x.Id).ToListAsync(); return Ok(new{items=items.Select(Summary),total=items.Count});
    }

    [HttpPatch("courses/{courseId}/quizzes/{quizId}")]
    public async Task<IActionResult> Update(string courseId,string quizId,QuizInput input)
    {
        if(Role!="instructor")return Forbidden("Only instructors can manage quizzes."); if(!Id(courseId,out var cid))return BadRequest(new{code="INVALID_COURSE_ID",message="Course ID must be a positive integer."}); if(!Id(quizId,out var qid))return BadRequest(new{code="INVALID_QUIZ_ID",message="Quiz ID must be a positive integer."});
        var owns=await OwnsDraft(cid); if(owns is null)return StatusCode(502,new{code="COURSE_SERVICE_UNAVAILABLE",message="Course Service is unavailable."}); if(!owns.Value)return NotFound(new{code="DRAFT_NOT_FOUND",message="The draft course was not found."}); if(ValidateQuiz(input) is IActionResult error)return error;
        await using var tx=await db.Database.BeginTransactionAsync(); var quiz=await db.Quizzes.Include(x=>x.Questions).SingleOrDefaultAsync(x=>x.Id==qid&&x.CourseId==cid&&x.InstructorId==UserId&&x.Status=="draft"); if(quiz is null)return NotFound(new{code="QUIZ_NOT_FOUND",message="The draft quiz was not found."});
        db.Questions.RemoveRange(quiz.Questions); quiz.Title=input.Title!.Trim(); quiz.Description=input.Description?.Trim(); quiz.TimeLimitMinutes=input.DurationMinutes; quiz.PassingScore=input.PassingScore; quiz.UpdatedAt=DateTime.UtcNow; quiz.Questions.Clear(); for(var i=0;i<input.Questions!.Count;i++)quiz.Questions.Add(BuildQuestion(input.Questions[i],cid,i+1)); await db.SaveChangesAsync(); await tx.CommitAsync(); return Ok(new{quiz=Summary(quiz)});
    }

    [HttpGet("courses/{courseId}/quizzes/{quizId}/mine")]
    public async Task<IActionResult> ManagementDetail(string courseId, string quizId)
    {
        if (Role != "instructor") return Forbidden("Only instructors can manage quizzes.");
        if (!Id(courseId, out var cid)) return BadRequest(new { code="INVALID_COURSE_ID", message="Course ID must be a positive integer." });
        if (!Id(quizId, out var qid)) return BadRequest(new { code="INVALID_QUIZ_ID", message="Quiz ID must be a positive integer." });
        var owns = await OwnsDraft(cid);
        if (owns is null) return StatusCode(502, new { code="COURSE_SERVICE_UNAVAILABLE", message="Course Service is unavailable." });
        if (!owns.Value) return NotFound(new { code="DRAFT_NOT_FOUND", message="The draft course was not found." });
        var quiz = await db.Quizzes.AsNoTracking().Include(x => x.Questions).SingleOrDefaultAsync(x => x.Id == qid && x.CourseId == cid && x.InstructorId == UserId && x.Status == "draft");
        if (quiz is null) return NotFound(new { code="QUIZ_NOT_FOUND", message="The draft quiz was not found." });
        return Ok(new { quiz = new { id=quiz.Id, courseId=quiz.CourseId, title=quiz.Title, description=quiz.Description, durationMinutes=quiz.TimeLimitMinutes, passingScore=quiz.PassingScore, questions=quiz.Questions.OrderBy(x=>x.OrderIndex).Select(x=>new { id=x.Id, questionText=x.Content, questionType=x.Topic, options=JsonSerializer.Deserialize<List<string>>(x.Options), correctOptionIndex=CorrectOptionIndex(x), points=x.Points, sequenceOrder=x.OrderIndex }) } });
    }

    [HttpDelete("courses/{courseId}/quizzes/{quizId}")]
    public async Task<IActionResult> Delete(string courseId,string quizId)
    {
        if(Role!="instructor")return Forbidden("Only instructors can manage quizzes."); if(!Id(courseId,out var cid))return BadRequest(new{code="INVALID_COURSE_ID",message="Course ID must be a positive integer."}); if(!Id(quizId,out var qid))return BadRequest(new{code="INVALID_QUIZ_ID",message="Quiz ID must be a positive integer."}); var owns=await OwnsDraft(cid); if(owns is null)return StatusCode(502,new{code="COURSE_SERVICE_UNAVAILABLE",message="Course Service is unavailable."}); if(!owns.Value)return NotFound(new{code="DRAFT_NOT_FOUND",message="The draft course was not found."});
        var affected=await db.Quizzes.Where(x=>x.Id==qid&&x.CourseId==cid&&x.InstructorId==UserId&&x.Status=="draft").ExecuteDeleteAsync(); return affected==0?NotFound(new{code="QUIZ_NOT_FOUND",message="The draft quiz was not found."}):Ok(new{deleted=true,quizId=qid});
    }

    [HttpPatch("courses/{courseId}/quizzes/{quizId}/publish")]
    public async Task<IActionResult> Publish(string courseId,string quizId)
    {
        if(Role!="instructor")return Forbidden("Only instructors can manage quizzes."); if(!Id(courseId,out var cid))return BadRequest(new{code="INVALID_COURSE_ID",message="Course ID must be a positive integer."}); if(!Id(quizId,out var qid))return BadRequest(new{code="INVALID_QUIZ_ID",message="Quiz ID must be a positive integer."}); var owns=await OwnsDraft(cid); if(owns is null)return StatusCode(502,new{code="COURSE_SERVICE_UNAVAILABLE",message="Course Service is unavailable."}); if(!owns.Value)return NotFound(new{code="DRAFT_NOT_FOUND",message="The draft course was not found."});
        await using var tx=await db.Database.BeginTransactionAsync(); var quiz=await db.Quizzes.Include(x=>x.Questions).SingleOrDefaultAsync(x=>x.Id==qid&&x.CourseId==cid&&x.InstructorId==UserId&&x.Status=="draft"); if(quiz is null)return NotFound(new{code="QUIZ_NOT_FOUND",message="The draft quiz was not found."}); if(quiz.Questions.Count==0||quiz.Questions.Sum(x=>x.Points)<=0)return Conflict(new{code="QUIZ_NOT_READY",message="Add at least one valid question before publishing the quiz."}); quiz.Status="published";quiz.UpdatedAt=DateTime.UtcNow;await db.SaveChangesAsync();await tx.CommitAsync();return Ok(new{quiz=Summary(quiz)});
    }

    [HttpGet("courses/{courseId}/quizzes")]
    public async Task<IActionResult> Published(string courseId){if(Role!="student")return Forbidden("Only students can view published quizzes.");if(!Id(courseId,out var cid))return BadRequest(new{code="INVALID_COURSE_ID",message="Course ID must be a positive integer."});var access=await StudentCourseAccess(cid);if(CourseAccessFailure(access) is IActionResult failure)return failure;var items=await db.Quizzes.AsNoTracking().Include(x=>x.Questions).Where(x=>x.CourseId==cid&&x.Status=="published").ToListAsync();return Ok(new{items=items.Select(x=>new{id=x.Id,courseId=x.CourseId,title=x.Title,description=x.Description,durationMinutes=x.TimeLimitMinutes,passingScore=x.PassingScore,questionCount=x.Questions.Count}),total=items.Count});}

    [HttpGet("quizzes/{quizId}")]
    public async Task<IActionResult> Load(string quizId){if(Role!="student")return Forbidden("Only students can take quizzes.");if(!Id(quizId,out var qid))return BadRequest(new{code="INVALID_QUIZ_ID",message="Quiz ID must be a positive integer."});var q=await db.Quizzes.AsNoTracking().Include(x=>x.Questions).SingleOrDefaultAsync(x=>x.Id==qid&&x.Status=="published");if(q is null)return NotFound(new{code="QUIZ_NOT_FOUND",message="The published quiz was not found."});var access=await StudentCourseAccess(q.CourseId);if(CourseAccessFailure(access) is IActionResult failure)return failure;return Ok(new{quiz=new{id=q.Id,courseId=q.CourseId,title=q.Title,description=q.Description,durationMinutes=q.TimeLimitMinutes,passingScore=q.PassingScore,questions=q.Questions.OrderBy(x=>x.OrderIndex).Select(x=>new{id=x.Id,questionText=x.Content,questionType=x.Topic,options=JsonSerializer.Deserialize<List<string>>(x.Options),points=x.Points,sequenceOrder=x.OrderIndex})}});}

    [HttpPost("quizzes/{quizId}/submit")]
    public async Task<IActionResult> Submit(string quizId,SubmitAnswersInput input)
    {
        if(Role!="student")return Forbidden("Only students can submit quizzes.");if(!Id(quizId,out var qid))return BadRequest(new{code="INVALID_QUIZ_ID",message="Quiz ID must be a positive integer."});var quiz=await db.Quizzes.Include(x=>x.Questions).SingleOrDefaultAsync(x=>x.Id==qid&&x.Status=="published");if(quiz is null)return NotFound(new{code="QUIZ_NOT_FOUND",message="The published quiz was not found."});var access=await StudentCourseAccess(quiz.CourseId);if(CourseAccessFailure(access) is IActionResult failure)return failure;var answers=input.Answers??[];if(answers.GroupBy(x=>x.QuestionId).Any(g=>g.Count()>1))return BadRequest(new{code="VALIDATION_ERROR",message="Each question may be answered only once."});var map=quiz.Questions.ToDictionary(x=>x.Id);foreach(var a in answers){if(!map.TryGetValue(a.QuestionId,out var question)||a.SelectedOptionIndex<0||a.SelectedOptionIndex>=JsonSerializer.Deserialize<List<string>>(question.Options)!.Count)return BadRequest(new{code="VALIDATION_ERROR",message="An answer contains an invalid question or option."});}
        if(await db.QuizResults.AnyAsync(x=>x.QuizId==qid&&x.StudentId==UserId))return Conflict(new{code="QUIZ_ALREADY_SUBMITTED",message="This quiz has already been submitted."});decimal earned=0;foreach(var a in answers)if(CorrectOptionIndex(map[a.QuestionId]) is int correct&&correct==a.SelectedOptionIndex)earned+=map[a.QuestionId].Points;var max=quiz.Questions.Sum(x=>x.Points);var percentage=max==0?0:Math.Round(earned/max*100,2);var result=new QuizResult{QuizId=qid,StudentId=UserId,Score=earned,MaximumScore=max,Percentage=percentage,Passed=percentage>=quiz.PassingScore,SubmittedAnswers=JsonSerializer.Serialize(answers),SubmittedAt=DateTime.UtcNow};db.QuizResults.Add(result);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException exception) when (IsDuplicateKey(exception))
        {
            db.Entry(result).State = EntityState.Detached;
            return Conflict(new { code="QUIZ_ALREADY_SUBMITTED", message="This quiz has already been submitted." });
        }
        return StatusCode(201,new{result=new{id=result.Id,quizId=qid,studentId=UserId,score=earned,maximumScore=max,percentage,passed=result.Passed,submittedAt=result.SubmittedAt}});
    }

    private object Result(QuizResult x)=>new{id=x.Id,quizId=x.QuizId,studentId=x.StudentId,score=x.Score,maximumScore=x.MaximumScore,percentage=x.Percentage,passed=x.Passed,submittedAt=x.SubmittedAt};
    [HttpGet("courses/{courseId}/results/summary")]
    public async Task<IActionResult> InstructorResults(string courseId)
    {
        if (Role != "instructor") return Forbidden("Only instructors can view course quiz results.");
        if (!Id(courseId, out var cid)) return BadRequest(new { code="INVALID_COURSE_ID", message="Course ID must be a positive integer." });
        var owns = await OwnsCourse(cid);
        if (owns is null) return StatusCode(502, new { code="COURSE_SERVICE_UNAVAILABLE", message="Course Service is unavailable." });
        if (!owns.Value) return NotFound(new { code="COURSE_NOT_FOUND", message="The course was not found." });

        var quizzes = await db.Quizzes.AsNoTracking()
            .Include(x => x.QuizResults)
            .Where(x => x.CourseId == cid && x.InstructorId == UserId)
            .OrderBy(x => x.Id)
            .ToListAsync();
        var results = quizzes.SelectMany(x => x.QuizResults.Select(r => new
        {
            id = r.Id,
            quizId = x.Id,
            quizTitle = x.Title,
            studentId = r.StudentId,
            score = r.Score,
            maximumScore = r.MaximumScore,
            percentage = r.Percentage,
            passed = r.Passed,
            submittedAt = r.SubmittedAt
        })).OrderByDescending(x => x.submittedAt).ToList();
        return Ok(new
        {
            courseId = cid,
            summary = new
            {
                quizCount = quizzes.Count,
                attemptCount = results.Count,
                passedCount = results.Count(x => x.passed),
                averagePercentage = results.Count == 0 ? 0 : Math.Round(results.Average(x => x.percentage), 2)
            },
            quizzes = quizzes.Select(x => new
            {
                id = x.Id,
                title = x.Title,
                status = x.Status,
                attemptCount = x.QuizResults.Count,
                averagePercentage = x.QuizResults.Count == 0 ? 0 : Math.Round(x.QuizResults.Average(r => r.Percentage), 2)
            }),
            results
        });
    }
    [HttpGet("results/mine")] public async Task<IActionResult> Results(){if(Role!="student")return Forbidden("Only students can view quiz results.");var items=await db.QuizResults.AsNoTracking().Where(x=>x.StudentId==UserId).OrderByDescending(x=>x.SubmittedAt).ToListAsync();return Ok(new{items=items.Select(Result),total=items.Count});}
    [HttpGet("results/{resultId}")] public async Task<IActionResult> ResultById(string resultId){if(Role!="student")return Forbidden("Only students can view quiz results.");if(!Id(resultId,out var rid))return BadRequest(new{code="INVALID_RESULT_ID",message="Result ID must be a positive integer."});var result=await db.QuizResults.AsNoTracking().SingleOrDefaultAsync(x=>x.Id==rid&&x.StudentId==UserId);return result is null?NotFound(new{code="RESULT_NOT_FOUND",message="The quiz result was not found."}):Ok(new{result=Result(result)});}
}
