# Deterministic Demo Data Map

The four databases remain independent. Numeric IDs below are coordinated only as logical cross-service identifiers; there are no cross-database foreign keys and no service reads another service's database.

## Seed namespace and counts

| Owned database | Deterministic seed range | Records added by the dataset |
|---|---|---:|
| User DB | users `9001`, `9002`, `9101`-`9105`, `9201`-`9220`; audit IDs in the `95000` range | 27 users and 81 login-audit rows |
| Course DB | courses `20001`-`20012`, lessons `21001`-`21060`, enrollments `22001`-`22040` | 12 courses, 60 lessons, 40 enrollments, 96 lesson completions |
| Exam DB | quizzes `30001`-`30008`, questions `31001`-`31040`, results `32001`-`32024` | 8 quizzes, 40 questions, 24 results |
| Payment DB | transactions `40001`-`40036` | 24 successful, 6 pending, and 6 failed transactions |

Existing volumes can contain additional user-created or test rows. `seed-demo-data.bat` prints the actual totals after every run.

## User ownership map

| IDs | Role | Notes |
|---|---|---|
| `9001`-`9002` | Admin | Both active; `9001` is the primary demo administrator |
| `9101`-`9105` | Instructor | Four active plus one inactive account-state example |
| `9201`-`9220` | Student | Eighteen active plus two inactive account-state examples |

## Course and quiz map

Course prices are stored in the existing USD-like demo units. Payment Service uses `COURSE_PRICE_TO_VND_RATE=25000`, so `31.96` becomes `799,000 VND`. Payment history stores the converted VND amount.

| Course ID | Course | Owner | Category | Price units / VND | State | Quiz ID |
|---:|---|---:|---|---:|---|---:|
| `20001` | Python Foundations | `9101` | Programming | Free | Published | `30001` |
| `20002` | Modern Web Development with React and Node | `9101` | Web Development | `31.96` / `799,000` | Published | `30002` |
| `20003` | MySQL Database Design | `9102` | Database | `23.96` / `599,000` | Published | `30003` |
| `20004` | Software Architecture Essentials | `9102` | Software Engineering | `29.96` / `749,000` | Published | `30004` |
| `20005` | Cloud Fundamentals with Docker | `9103` | Cloud | `35.96` / `899,000` | Published | `30005` |
| `20006` | Data Analytics with SQL | `9103` | Data | `25.96` / `649,000` | Published | `30006` |
| `20007` | Applied AI for Developers | `9104` | AI | `39.96` / `999,000` | Published | `30007` |
| `20008` | REST API Engineering | `9104` | Web Development | `19.96` / `499,000` | Published | `30008` |
| `20009` | Git and Team Collaboration | `9105` | Software Engineering | Free | Published | None |
| `20010` | Advanced TypeScript Patterns | `9101` | Programming | `27.96` / `699,000` | Draft | None |
| `20011` | Kubernetes Delivery Workshop | `9103` | Cloud | `43.96` / `1,099,000` | Draft | None |
| `20012` | Practical Machine Learning Lab | `9104` | AI | `47.96` / `1,199,000` | Draft | None |

Every course has five ordered lessons. The deterministic completion pattern covers `0`, `20`, `40`, `60`, `80`, and `100` percent and persists 96 unique `lesson_progress` records.

## Ready-to-demonstrate facts

### Student `9201` (`student1@lms.demo`)

- Enrolled in Python Foundations at 0%, React and Node at 20%, and MySQL Database Design at 40%.
- Has historical results for the Python and React quizzes.
- Has no seeded result for quiz `30003`, so the MySQL quiz remains available for a live take-quiz demonstration.
- Successful demo-seed payment history exists for the two paid enrollments.

### Instructor `9101` (`instructor1@lms.demo`)

- Owns two published courses (`20001`, `20002`) and one editable draft (`20010`).
- Owned published courses have multiple enrollments, lesson progress, quizzes, and result history, so monitoring views are non-zero.

### Admin `9001` (`admin@lms.demo`)

- User management includes active and inactive accounts across all three roles.
- Login activity contains successful and failed attempts across different dates.
- Revenue reporting has 36 demo transactions and `17,926,000 VND` of deterministic successful revenue.

## Payment consistency

- Every successful `demo_seed` payment maps to an active Course DB enrollment for the same logical student/course IDs.
- Pending and failed demo transactions do not create enrollment records.
- Provider transaction IDs `DEMO-SEED-0001` through `DEMO-SEED-0036` are unique.
- The supported `gateway`/provider value `demo_seed` makes the historical ledger distinguishable from real ZaloPay Sandbox activity.

## Idempotency and collision safety

The demo seed uses deterministic primary keys and natural keys. Before any seed SQL is applied to an existing volume, `seed-demo-data.bat` performs read-only collision checks in all four databases. It verifies user ID/email, course ID/title, lesson course/order, enrollment student/course, quiz and question ownership, result student/quiz, and payment provider-transaction identity. It also validates the deterministic cross-database user, course, quiz, result, and payment references in memory.

If any expected ID is paired with a different natural key, or an expected natural key belongs to a different ID, the complete seed run stops before changing any database and lists only the affected demo identity. This prevents a shared or long-lived Docker volume from having unrelated rows overwritten. Resolve the conflict deliberately or choose a different deterministic seed range; never bypass the preflight by sourcing a demo SQL file directly into an existing volume.

Fresh Docker volumes receive the same SQL through MySQL's first-start initializer, where the application tables are empty. All seed domains use the fixed timestamp anchor `2026-07-01 12:00:00`, so repeated runs preserve both row counts and historical timestamps. Conditional upserts provide an additional safeguard by updating a row only when its deterministic identity still matches.
