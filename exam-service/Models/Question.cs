using System.ComponentModel.DataAnnotations.Schema;

namespace ExamService.Models
{
    public class Question
    {
        public int Id { get; set; }
        public int CourseId { get; set; }
        public string Topic { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        
        [Column(TypeName = "json")]
        public string Options { get; set; } = string.Empty; 
        
        public string CorrectAnswer { get; set; } = string.Empty;
        public string Difficulty { get; set; } = "medium";
    }
}
