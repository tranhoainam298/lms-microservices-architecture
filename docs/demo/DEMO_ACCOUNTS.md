# Local Demo Accounts

These accounts exist only in the deterministic local demonstration dataset. They are not production credentials.

## Quick login set

| Role | Email | Demo password | Expected state |
|---|---|---|---|
| Admin | `admin@lms.demo` | `LmsDemo@2026` | Active |
| Instructor | `instructor1@lms.demo` | `LmsDemo@2026` | Active |
| Student | `student1@lms.demo` | `LmsDemo@2026` | Active |

Choose the matching role on the login screen. The User Service still validates the role and account state on the server.

## Additional accounts

- Admin: `admin2@lms.demo`
- Instructors: `instructor2@lms.demo` through `instructor4@lms.demo`
- Students: `student2@lms.demo` through `student18@lms.demo`
- Intentionally inactive examples: `instructor5@lms.demo`, `student19@lms.demo`, and `student20@lms.demo`

All seeded demo accounts use the same documented demo password. The database stores one bcrypt hash generated with the User Service setting of 12 salt rounds; it never stores the plaintext password.

## Safety

- Run `seed-demo-data.bat` only for a local demonstration environment.
- Change or remove all demo accounts before adapting this Compose topology for a shared environment.
- Never reuse this password for a real account.
- The seeder updates only deterministic `@lms.demo` records and never deletes user-created accounts.
