-- Deterministic local-demo quiz, question, and result data.
-- Existing volumes must be seeded through seed-demo-data.bat so its read-only identity
-- collision checks complete across all four databases before this file can write.

SET @demo_seed_anchor = TIMESTAMP('2026-07-01 12:00:00');

START TRANSACTION;

INSERT INTO quizzes
  (Id, CourseId, InstructorId, Title, Description, TimeLimitMinutes, PassingScore, Status, CreatedAt)
VALUES
  (30001, 20001, 9101, 'Python Foundations Checkpoint', 'Check core Python syntax, collections, functions, and testing habits.', 20, 60, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 55 DAY)),
  (30002, 20002, 9101, 'React and Node Full-Stack Quiz', 'Review component state, HTTP APIs, authentication, and full-stack integration.', 25, 70, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 50 DAY)),
  (30003, 20003, 9102, 'MySQL Design and Query Quiz', 'Assess normalization, indexes, joins, and transaction knowledge.', 25, 60, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 48 DAY)),
  (30004, 20004, 9102, 'Software Architecture Decisions', 'Apply quality attributes, boundaries, and architecture decision practices.', 30, 70, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 44 DAY)),
  (30005, 20005, 9103, 'Cloud and Docker Essentials', 'Review images, containers, configuration, networking, and delivery basics.', 25, 60, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 40 DAY)),
  (30006, 20006, 9103, 'SQL Analytics Skills Check', 'Test metric definitions, grouping, data quality, and analytical query design.', 25, 60, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 36 DAY)),
  (30007, 20007, 9104, 'Responsible Applied AI', 'Review model evaluation, context, limitations, and responsible AI practices.', 30, 70, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 32 DAY)),
  (30008, 20008, 9104, 'REST API Engineering Review', 'Assess resources, validation, authentication, errors, and API testing.', 25, 60, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 28 DAY))
ON DUPLICATE KEY UPDATE
  CourseId = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(CourseId), quizzes.CourseId),
  InstructorId = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(InstructorId), quizzes.InstructorId),
  Title = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(Title), quizzes.Title),
  Description = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(Description), quizzes.Description),
  TimeLimitMinutes = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(TimeLimitMinutes), quizzes.TimeLimitMinutes),
  PassingScore = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(PassingScore), quizzes.PassingScore),
  Status = IF(quizzes.Id = VALUES(Id) AND quizzes.CourseId = VALUES(CourseId) AND quizzes.InstructorId = VALUES(InstructorId) AND BINARY quizzes.Title = BINARY VALUES(Title), VALUES(Status), quizzes.Status);

INSERT INTO questions
  (Id, CourseId, QuizId, Topic, Content, Options, CorrectAnswer, Difficulty, Points, OrderIndex)
VALUES
  (31001, 20001, 30001, 'variables', 'Which Python value is immutable?', JSON_ARRAY('list', 'dictionary', 'tuple', 'set'), '2', 'easy', 10, 1),
  (31002, 20001, 30001, 'collections', 'Which expression creates a dictionary?', JSON_ARRAY('["a", 1]', '{"a": 1}', '("a", 1)', '{"a", 1}'), '1', 'easy', 10, 2),
  (31003, 20001, 30001, 'functions', 'What does a Python function return when no return value is specified?', JSON_ARRAY('0', 'false', 'None', 'an empty string'), '2', 'medium', 10, 3),
  (31004, 20001, 30001, 'errors', 'Which construct handles a recoverable exception?', JSON_ARRAY('if/else', 'try/except', 'for/while', 'class/def'), '1', 'easy', 10, 4),
  (31005, 20001, 30001, 'testing', 'What makes a unit test useful?', JSON_ARRAY('It depends on production data', 'It checks one behavior with a clear result', 'It always uses a network', 'It changes source files'), '1', 'medium', 10, 5),

  (31006, 20002, 30002, 'react', 'Which React hook stores local component state?', JSON_ARRAY('useEffect', 'useState', 'useMemo', 'useRef'), '1', 'easy', 10, 1),
  (31007, 20002, 30002, 'http', 'Which HTTP method is normally used to create a resource?', JSON_ARRAY('GET', 'POST', 'HEAD', 'OPTIONS'), '1', 'easy', 10, 2),
  (31008, 20002, 30002, 'node', 'What is Express middleware commonly used for?', JSON_ARRAY('Compiling CSS only', 'Processing a request before a route handler', 'Creating database tables automatically', 'Rendering native mobile views'), '1', 'medium', 10, 3),
  (31009, 20002, 30002, 'security', 'Where should a server-side secret be stored?', JSON_ARRAY('In browser JavaScript', 'In a public URL', 'In protected server configuration', 'In an HTML comment'), '2', 'medium', 10, 4),
  (31010, 20002, 30002, 'integration', 'What should the client do after an API returns a validation error?', JSON_ARRAY('Pretend the save worked', 'Show a useful error and preserve input', 'Delete the account', 'Retry forever'), '1', 'easy', 10, 5),

  (31011, 20003, 30003, 'normalization', 'What is a primary goal of normalization?', JSON_ARRAY('Duplicate every value', 'Reduce inconsistent duplication', 'Remove all keys', 'Avoid relationships'), '1', 'easy', 10, 1),
  (31012, 20003, 30003, 'indexes', 'Which workload most benefits from an index on a filter column?', JSON_ARRAY('Frequent selective reads', 'Only full table rewrites', 'Image resizing', 'CSS compilation'), '0', 'medium', 10, 2),
  (31013, 20003, 30003, 'joins', 'An INNER JOIN returns which rows?', JSON_ARRAY('Only matching rows from both inputs', 'Every left row only', 'Every right row only', 'No rows'), '0', 'easy', 10, 3),
  (31014, 20003, 30003, 'transactions', 'What does transaction atomicity guarantee?', JSON_ARRAY('All operations commit or none do', 'Queries never use indexes', 'Tables cannot grow', 'Every request is public'), '0', 'medium', 10, 4),
  (31015, 20003, 30003, 'constraints', 'Which constraint prevents duplicate values in a business key?', JSON_ARRAY('DEFAULT', 'UNIQUE', 'COMMENT', 'VIEW'), '1', 'easy', 10, 5),

  (31016, 20004, 30004, 'quality attributes', 'Which is a quality attribute?', JSON_ARRAY('Availability', 'Variable name', 'Font file', 'Course price'), '0', 'easy', 10, 1),
  (31017, 20004, 30004, 'decisions', 'What should an architecture decision record capture?', JSON_ARRAY('Only source code', 'Context, decision, and consequences', 'Passwords', 'Personal messages'), '1', 'medium', 10, 2),
  (31018, 20004, 30004, 'boundaries', 'Why define clear module boundaries?', JSON_ARRAY('To increase hidden coupling', 'To make responsibilities and dependencies explicit', 'To remove all APIs', 'To avoid testing'), '1', 'medium', 10, 3),
  (31019, 20004, 30004, 'reliability', 'Which technique limits repeated calls to a failing dependency?', JSON_ARRAY('Circuit breaker', 'Global variable', 'CSS reset', 'Table scan'), '0', 'medium', 10, 4),
  (31020, 20004, 30004, 'tradeoffs', 'A sound architecture choice should primarily be based on what?', JSON_ARRAY('Project constraints and required qualities', 'The newest trend only', 'A random diagram', 'The longest implementation'), '0', 'hard', 10, 5),

  (31021, 20005, 30005, 'images', 'What does a container image provide?', JSON_ARRAY('A repeatable application filesystem and metadata', 'A production password', 'A physical server', 'A database backup policy'), '0', 'easy', 10, 1),
  (31022, 20005, 30005, 'containers', 'What is an important container practice?', JSON_ARRAY('Store secrets in the image', 'Keep configuration outside the image', 'Run every app as root', 'Disable health checks'), '1', 'medium', 10, 2),
  (31023, 20005, 30005, 'networking', 'How do containers on the same Compose network normally reach each other?', JSON_ARRAY('By service name', 'By browser bookmark', 'By screen size', 'By source file path'), '0', 'easy', 10, 3),
  (31024, 20005, 30005, 'health', 'What should a health check indicate?', JSON_ARRAY('Whether the process can serve its responsibility', 'The latest UI color', 'The Git author', 'The course category'), '0', 'medium', 10, 4),
  (31025, 20005, 30005, 'delivery', 'What supports a safer deployment?', JSON_ARRAY('No rollback plan', 'A verified build and health checks', 'Deleting all data', 'Changing credentials in source'), '1', 'medium', 10, 5),

  (31026, 20006, 30006, 'metrics', 'A reliable business metric begins with what?', JSON_ARRAY('A clear definition', 'A random chart', 'A larger font', 'A hidden filter'), '0', 'easy', 10, 1),
  (31027, 20006, 30006, 'aggregation', 'Which clause groups rows for aggregate calculations?', JSON_ARRAY('ORDER BY', 'GROUP BY', 'VALUES', 'GRANT'), '1', 'easy', 10, 2),
  (31028, 20006, 30006, 'quality', 'What should happen before publishing a dashboard metric?', JSON_ARRAY('Validate its source and edge cases', 'Remove its definition', 'Hardcode a result', 'Ignore missing values'), '0', 'medium', 10, 3),
  (31029, 20006, 30006, 'time', 'Why define a reporting date range explicitly?', JSON_ARRAY('To make comparisons reproducible', 'To avoid all indexes', 'To expose passwords', 'To change user roles'), '0', 'medium', 10, 4),
  (31030, 20006, 30006, 'analysis', 'Which query pattern calculates an average per group?', JSON_ARRAY('AVG with GROUP BY', 'DROP with ORDER BY', 'GRANT with LIMIT', 'ALTER with JOIN'), '0', 'easy', 10, 5),

  (31031, 20007, 30007, 'evaluation', 'Why keep a validation set separate from training data?', JSON_ARRAY('To estimate performance on unseen examples', 'To increase data leakage', 'To store passwords', 'To remove labels'), '0', 'medium', 10, 1),
  (31032, 20007, 30007, 'context', 'What should an educational AI assistant do when context is insufficient?', JSON_ARRAY('Invent a confident answer', 'Explain what information is missing', 'Reveal a secret', 'Change the database'), '1', 'easy', 10, 2),
  (31033, 20007, 30007, 'responsibility', 'Which data should not be sent to an AI provider?', JSON_ARRAY('Lesson title', 'Course summary', 'API keys and passwords', 'Student question'), '2', 'easy', 10, 3),
  (31034, 20007, 30007, 'metrics', 'Which metric is useful for an imbalanced classification problem?', JSON_ARRAY('Precision and recall', 'File size only', 'Screen width', 'Line count'), '0', 'medium', 10, 4),
  (31035, 20007, 30007, 'limitations', 'What is the safest response to an unavailable model provider?', JSON_ARRAY('Return a clear availability error', 'Return a fake answer', 'Expose the provider key', 'Mark the lesson complete'), '0', 'medium', 10, 5),

  (31036, 20008, 30008, 'resources', 'Which path best represents one course resource?', JSON_ARRAY('/courses/:courseId', '/doEverything', '/database', '/secret'), '0', 'easy', 10, 1),
  (31037, 20008, 30008, 'validation', 'Where must authoritative request validation happen?', JSON_ARRAY('Only in CSS', 'On the server', 'Only in local storage', 'In a screenshot'), '1', 'easy', 10, 2),
  (31038, 20008, 30008, 'errors', 'A useful API error response should include what?', JSON_ARRAY('A stable code and safe message', 'A database password', 'A full secret token', 'A fake success flag'), '0', 'medium', 10, 3),
  (31039, 20008, 30008, 'authentication', 'What should identify an authenticated student to a protected API?', JSON_ARRAY('A verified token', 'A client-supplied studentId alone', 'A CSS class', 'A query comment'), '0', 'medium', 10, 4),
  (31040, 20008, 30008, 'testing', 'Which test best verifies an endpoint contract?', JSON_ARRAY('Assert status and response shape for representative inputs', 'Check only file length', 'Rename the route', 'Disable authentication'), '0', 'medium', 10, 5)
ON DUPLICATE KEY UPDATE
  CourseId = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(CourseId), questions.CourseId),
  QuizId = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(QuizId), questions.QuizId),
  Topic = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(Topic), questions.Topic),
  Content = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(Content), questions.Content),
  Options = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(Options), questions.Options),
  CorrectAnswer = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(CorrectAnswer), questions.CorrectAnswer),
  Difficulty = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(Difficulty), questions.Difficulty),
  Points = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(Points), questions.Points),
  OrderIndex = IF(questions.Id = VALUES(Id) AND questions.CourseId = VALUES(CourseId) AND questions.QuizId = VALUES(QuizId) AND questions.OrderIndex = VALUES(OrderIndex), VALUES(OrderIndex), questions.OrderIndex);

INSERT INTO quiz_results
  (Id, StudentId, QuizId, Score, MaximumScore, Percentage, Passed, SubmittedAnswers, SubmittedAt)
VALUES
  (32001, 9201, 30001, 20.00, 50, 40, 0, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 21 DAY)),
  (32002, 9202, 30001, 30.00, 50, 60, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 19 DAY)),
  (32003, 9203, 30001, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 17 DAY)),
  (32004, 9205, 30001, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 15 DAY)),
  (32005, 9201, 30002, 30.00, 50, 60, 0, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 20 DAY)),
  (32006, 9202, 30002, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 18 DAY)),
  (32007, 9204, 30002, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 16 DAY)),
  (32008, 9207, 30002, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 14 DAY)),
  (32009, 9216, 30003, 20.00, 50, 40, 0, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 19 DAY)),
  (32010, 9203, 30003, 30.00, 50, 60, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 17 DAY)),
  (32011, 9206, 30003, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 15 DAY)),
  (32012, 9211, 30003, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 13 DAY)),
  (32013, 9202, 30004, 30.00, 50, 60, 0, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 18 DAY)),
  (32014, 9204, 30004, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 16 DAY)),
  (32015, 9208, 30004, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 14 DAY)),
  (32016, 9214, 30004, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 12 DAY)),
  (32017, 9203, 30005, 20.00, 50, 40, 0, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 17 DAY)),
  (32018, 9205, 30005, 30.00, 50, 60, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 15 DAY)),
  (32019, 9210, 30005, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 13 DAY)),
  (32020, 9215, 30005, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 11 DAY)),
  (32021, 9204, 30006, 30.00, 50, 60, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 16 DAY)),
  (32022, 9206, 30006, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 14 DAY)),
  (32023, 9210, 30006, 40.00, 50, 80, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 12 DAY)),
  (32024, 9212, 30006, 50.00, 50, 100, 1, JSON_ARRAY(), DATE_SUB(@demo_seed_anchor, INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE
  StudentId = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(StudentId), quiz_results.StudentId),
  QuizId = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(QuizId), quiz_results.QuizId),
  Score = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(Score), quiz_results.Score),
  MaximumScore = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(MaximumScore), quiz_results.MaximumScore),
  Percentage = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(Percentage), quiz_results.Percentage),
  Passed = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(Passed), quiz_results.Passed),
  SubmittedAnswers = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(SubmittedAnswers), quiz_results.SubmittedAnswers),
  SubmittedAt = IF(quiz_results.Id = VALUES(Id) AND quiz_results.StudentId = VALUES(StudentId) AND quiz_results.QuizId = VALUES(QuizId), VALUES(SubmittedAt), quiz_results.SubmittedAt);

COMMIT;
