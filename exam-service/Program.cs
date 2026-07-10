using System.Text;
using System.Security.Cryptography;
using ExamService.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET");
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    Console.Error.WriteLine("FATAL ERROR: JWT_SECRET is not defined.");
    Environment.ExitCode = 1;
    return;
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Exam database connection is not configured.");
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<ExamDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
builder.Services.AddHttpClient("CourseService", client =>
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("COURSE_SERVICE_URL") ?? "http://localhost:5002"));
builder.Services.AddAuthorization();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    await ExamSchemaMigrator.MigrateAsync(scope.ServiceProvider.GetRequiredService<ExamDbContext>());
}
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.Use(async (context, next) =>
{
    var authorization = context.Request.Headers.Authorization.ToString();
    var missing = !authorization.StartsWith("Bearer ", StringComparison.Ordinal);
    var valid = false;
    if (!missing)
    {
        try
        {
            var token = authorization[7..];
            var parts = token.Split('.');
            using var header = JsonDocument.Parse(Decode(parts[0]));
            using var payload = JsonDocument.Parse(Decode(parts[1]));
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(jwtSecret));
            var expected = hmac.ComputeHash(Encoding.ASCII.GetBytes($"{parts[0]}.{parts[1]}"));
            var supplied = Decode(parts[2]);
            var id = payload.RootElement.TryGetProperty("id", out var idClaim) ? idClaim.GetInt32() : payload.RootElement.GetProperty("sub").GetInt32();
            var role = payload.RootElement.GetProperty("role").GetString()?.ToLowerInvariant();
            var exp = payload.RootElement.GetProperty("exp").GetInt64();
            valid = parts.Length == 3 && header.RootElement.GetProperty("alg").GetString() == "HS256" && id > 0 && !string.IsNullOrWhiteSpace(role) && exp > DateTimeOffset.UtcNow.ToUnixTimeSeconds() && CryptographicOperations.FixedTimeEquals(expected, supplied);
            if (valid) context.User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("id", id.ToString()), new Claim("role", role!) }, "JWT"));
        }
        catch { valid = false; }
    }
    if (!valid)
    {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsJsonAsync(new { code = missing ? "UNAUTHORIZED" : "INVALID_TOKEN", message = missing ? "Authorization token is required." : "The access token is invalid or expired." });
        return;
    }
    await next();
});
app.UseAuthorization();
app.MapControllers();
app.Run();

static byte[] Decode(string value)
{
    var normalized = value.Replace('-', '+').Replace('_', '/');
    normalized += (normalized.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
    return Convert.FromBase64String(normalized);
}
