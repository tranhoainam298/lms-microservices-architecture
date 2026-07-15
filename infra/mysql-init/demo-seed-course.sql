-- Deterministic local-demo data. Safe to run repeatedly.
-- Cross-service IDs are documented in docs/demo/DEMO_DATA_MAP.md.
-- Existing volumes must be seeded through seed-demo-data.bat so its read-only identity
-- collision checks complete across all four databases before this file can write.

SET @demo_seed_anchor = TIMESTAMP('2026-07-01 12:00:00');

START TRANSACTION;

INSERT INTO courses
  (id, title, description, category, price, cover_image, instructor_id, status, created_at)
VALUES
  (20001, 'Python Foundations', 'Learn Python syntax, data structures, functions, testing, and a practical command-line project.', 'Programming', 0, 'https://placehold.co/1200x675/DBEAFE/1E3A8A?text=Python+Foundations', 9101, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 90 DAY)),
  (20002, 'Modern Web Development with React and Node', 'Build a responsive client, REST API, authentication flow, and deployable full-stack application.', 'Web Development', 31.96, 'https://placehold.co/1200x675/EDE9FE/5B21B6?text=React+and+Node', 9101, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 85 DAY)),
  (20003, 'MySQL Database Design', 'Design normalized schemas, write production queries, use transactions, and improve database performance.', 'Database', 23.96, 'https://placehold.co/1200x675/DCFCE7/166534?text=MySQL+Design', 9102, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 80 DAY)),
  (20004, 'Software Architecture Essentials', 'Apply modular design, quality attributes, integration patterns, and architecture decision records.', 'Software Engineering', 29.96, 'https://placehold.co/1200x675/FEF3C7/92400E?text=Software+Architecture', 9102, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 75 DAY)),
  (20005, 'Cloud Fundamentals with Docker', 'Package applications, configure containers, understand cloud primitives, and deliver a small service.', 'Cloud', 35.96, 'https://placehold.co/1200x675/E0F2FE/075985?text=Cloud+and+Docker', 9103, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 70 DAY)),
  (20006, 'Data Analytics with SQL', 'Turn raw relational data into reliable metrics, dashboards, cohorts, and actionable insights.', 'Data', 25.96, 'https://placehold.co/1200x675/FCE7F3/9D174D?text=Data+Analytics', 9103, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 65 DAY)),
  (20007, 'Applied AI for Developers', 'Understand practical machine learning workflows and add responsible AI capabilities to an application.', 'AI', 39.96, 'https://placehold.co/1200x675/FAE8FF/86198F?text=Applied+AI', 9104, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 60 DAY)),
  (20008, 'REST API Engineering', 'Design consistent resources, validation, authentication, error contracts, tests, and API documentation.', 'Web Development', 19.96, 'https://placehold.co/1200x675/FFE4E6/9F1239?text=REST+API+Engineering', 9104, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 55 DAY)),
  (20009, 'Git and Team Collaboration', 'Practice branching, pull requests, code review, conflict resolution, and healthy delivery habits.', 'Software Engineering', 0, 'https://placehold.co/1200x675/F1F5F9/334155?text=Git+Collaboration', 9105, 'published', DATE_SUB(@demo_seed_anchor, INTERVAL 50 DAY)),
  (20010, 'Advanced TypeScript Patterns', 'Explore strict typing, generics, domain models, and scalable frontend architecture.', 'Programming', 27.96, 'https://placehold.co/1200x675/DBEAFE/1D4ED8?text=Advanced+TypeScript', 9101, 'draft', DATE_SUB(@demo_seed_anchor, INTERVAL 20 DAY)),
  (20011, 'Kubernetes Delivery Workshop', 'Draft workshop covering deployments, services, configuration, observability, and safe rollouts.', 'Cloud', 43.96, 'https://placehold.co/1200x675/CFFAFE/155E75?text=Kubernetes+Workshop', 9103, 'draft', DATE_SUB(@demo_seed_anchor, INTERVAL 15 DAY)),
  (20012, 'Practical Machine Learning Lab', 'Draft hands-on lab for data preparation, model training, evaluation, and responsible deployment.', 'AI', 47.96, 'https://placehold.co/1200x675/F3E8FF/6B21A8?text=Machine+Learning+Lab', 9104, 'draft', DATE_SUB(@demo_seed_anchor, INTERVAL 10 DAY))
ON DUPLICATE KEY UPDATE
  title = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(title), courses.title),
  description = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(description), courses.description),
  category = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(category), courses.category),
  price = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(price), courses.price),
  cover_image = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(cover_image), courses.cover_image),
  instructor_id = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(instructor_id), courses.instructor_id),
  status = IF(courses.id = VALUES(id) AND BINARY courses.title = BINARY VALUES(title), VALUES(status), courses.status);

-- Five lessons per course produce 60 useful lesson records and exact 20% progress steps.
INSERT INTO lessons
  (id, course_id, title, content, video_url, document_url, order_index)
SELECT
  21000 + ((c.course_sequence - 1) * 5) + t.lesson_number,
  c.course_id,
  CONCAT(c.short_title, ': ', t.lesson_title),
  CONCAT(t.content_prefix, ' This lesson applies the ideas directly to ', c.short_title, '. ', c.course_outcome),
  CASE WHEN t.lesson_number IN (2, 4)
    THEN 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
    ELSE NULL END,
  CASE WHEN t.lesson_number IN (1, 3, 5)
    THEN 'https://developer.mozilla.org/en-US/docs/Learn'
    ELSE NULL END,
  t.lesson_number
FROM (
  SELECT 1 course_sequence, 20001 course_id, 'Python Foundations' short_title, 'You will finish with a tested Python project.' course_outcome
  UNION ALL SELECT 2, 20002, 'React and Node', 'You will finish with a working full-stack feature.'
  UNION ALL SELECT 3, 20003, 'MySQL Design', 'You will finish with a normalized and indexed schema.'
  UNION ALL SELECT 4, 20004, 'Software Architecture', 'You will finish with an evidence-based architecture decision.'
  UNION ALL SELECT 5, 20005, 'Cloud and Docker', 'You will finish with a containerized service.'
  UNION ALL SELECT 6, 20006, 'Data Analytics', 'You will finish with a reusable metrics query.'
  UNION ALL SELECT 7, 20007, 'Applied AI', 'You will finish with a responsible AI feature plan.'
  UNION ALL SELECT 8, 20008, 'REST API Engineering', 'You will finish with a tested API contract.'
  UNION ALL SELECT 9, 20009, 'Git Collaboration', 'You will finish with a review-ready team workflow.'
  UNION ALL SELECT 10, 20010, 'Advanced TypeScript', 'You will finish with a strongly typed domain module.'
  UNION ALL SELECT 11, 20011, 'Kubernetes Workshop', 'You will finish with a safe deployment manifest.'
  UNION ALL SELECT 12, 20012, 'Machine Learning Lab', 'You will finish with an evaluated model experiment.'
) c
CROSS JOIN (
  SELECT 1 lesson_number, 'Orientation and learning goals' lesson_title, 'Set up the learning environment, review the roadmap, and define a concrete outcome.' content_prefix
  UNION ALL SELECT 2, 'Core concepts', 'Study the essential concepts through guided explanations and examples.'
  UNION ALL SELECT 3, 'Guided practice', 'Follow a structured exercise, compare approaches, and record what you learned.'
  UNION ALL SELECT 4, 'Applied project', 'Build a small project that combines the techniques introduced so far.'
  UNION ALL SELECT 5, 'Review and next steps', 'Review the key ideas, complete the knowledge check, and plan the next practice step.'
) t
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  course_id = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(course_id), lessons.course_id),
  title = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(title), lessons.title),
  content = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(content), lessons.content),
  video_url = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(video_url), lessons.video_url),
  document_url = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(document_url), lessons.document_url),
  order_index = IF(lessons.id = VALUES(id) AND lessons.course_id = VALUES(course_id) AND lessons.order_index = VALUES(order_index), VALUES(order_index), lessons.order_index);

INSERT INTO enrollments
  (id, student_id, course_id, progress_percent, status, enrolled_at)
VALUES
  (22001, 9201, 20001, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 45 DAY)),
  (22002, 9201, 20002, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 40 DAY)),
  (22003, 9201, 20003, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 35 DAY)),
  (22004, 9202, 20001, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 42 DAY)),
  (22005, 9202, 20002, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 37 DAY)),
  (22006, 9202, 20004, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 32 DAY)),
  (22007, 9203, 20001, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 39 DAY)),
  (22008, 9203, 20003, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 34 DAY)),
  (22009, 9203, 20005, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 29 DAY)),
  (22010, 9204, 20002, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 41 DAY)),
  (22011, 9204, 20004, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 36 DAY)),
  (22012, 9204, 20006, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 31 DAY)),
  (22013, 9205, 20001, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 38 DAY)),
  (22014, 9205, 20005, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 33 DAY)),
  (22015, 9205, 20007, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 28 DAY)),
  (22016, 9206, 20003, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 43 DAY)),
  (22017, 9206, 20006, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 38 DAY)),
  (22018, 9206, 20008, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 33 DAY)),
  (22019, 9207, 20002, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 36 DAY)),
  (22020, 9207, 20007, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 31 DAY)),
  (22021, 9208, 20004, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 44 DAY)),
  (22022, 9208, 20008, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 39 DAY)),
  (22023, 9209, 20001, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 35 DAY)),
  (22024, 9209, 20009, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 30 DAY)),
  (22025, 9210, 20005, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 42 DAY)),
  (22026, 9210, 20006, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 37 DAY)),
  (22027, 9211, 20002, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 40 DAY)),
  (22028, 9211, 20003, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 35 DAY)),
  (22029, 9212, 20006, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 38 DAY)),
  (22030, 9212, 20007, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 33 DAY)),
  (22031, 9213, 20001, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 34 DAY)),
  (22032, 9213, 20008, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 29 DAY)),
  (22033, 9214, 20004, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 41 DAY)),
  (22034, 9214, 20009, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 36 DAY)),
  (22035, 9215, 20002, 80, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 39 DAY)),
  (22036, 9215, 20005, 100, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 34 DAY)),
  (22037, 9216, 20003, 0, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 37 DAY)),
  (22038, 9216, 20007, 20, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 32 DAY)),
  (22039, 9217, 20006, 40, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 35 DAY)),
  (22040, 9217, 20008, 60, 'active', DATE_SUB(@demo_seed_anchor, INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE
  student_id = IF(enrollments.id = VALUES(id) AND enrollments.student_id = VALUES(student_id) AND enrollments.course_id = VALUES(course_id), VALUES(student_id), enrollments.student_id),
  course_id = IF(enrollments.id = VALUES(id) AND enrollments.student_id = VALUES(student_id) AND enrollments.course_id = VALUES(course_id), VALUES(course_id), enrollments.course_id),
  progress_percent = IF(enrollments.id = VALUES(id) AND enrollments.student_id = VALUES(student_id) AND enrollments.course_id = VALUES(course_id), VALUES(progress_percent), enrollments.progress_percent),
  status = IF(enrollments.id = VALUES(id) AND enrollments.student_id = VALUES(student_id) AND enrollments.course_id = VALUES(course_id), VALUES(status), enrollments.status),
  enrolled_at = IF(enrollments.id = VALUES(id) AND enrollments.student_id = VALUES(student_id) AND enrollments.course_id = VALUES(course_id), VALUES(enrolled_at), enrollments.enrolled_at);

-- Generate exactly the completion rows represented by progress_percent.
INSERT INTO lesson_progress
  (student_id, course_id, lesson_id, status, completed_at)
SELECT
  e.student_id,
  e.course_id,
  l.id,
  'completed',
  DATE_ADD(e.enrolled_at, INTERVAL l.order_index DAY)
FROM enrollments e
JOIN lessons l ON l.course_id = e.course_id
WHERE (e.student_id, e.course_id) IN (
    (9201,20001),(9201,20002),(9201,20003),(9202,20001),(9202,20002),(9202,20004),
    (9203,20001),(9203,20003),(9203,20005),(9204,20002),(9204,20004),(9204,20006),
    (9205,20001),(9205,20005),(9205,20007),(9206,20003),(9206,20006),(9206,20008),
    (9207,20002),(9207,20007),(9208,20004),(9208,20008),(9209,20001),(9209,20009),
    (9210,20005),(9210,20006),(9211,20002),(9211,20003),(9212,20006),(9212,20007),
    (9213,20001),(9213,20008),(9214,20004),(9214,20009),(9215,20002),(9215,20005),
    (9216,20003),(9216,20007),(9217,20006),(9217,20008)
  )
  AND l.id BETWEEN 21001 AND 21060
  AND l.order_index <= ROUND(e.progress_percent / 20)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  completed_at = VALUES(completed_at);

COMMIT;
