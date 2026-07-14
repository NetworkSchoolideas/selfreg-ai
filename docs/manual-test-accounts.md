# Manual Test Accounts

These accounts are reserved for manual auth and production smoke testing.

Passwords are intentionally not stored in the repository. Keep them in the secure operator context used for manual QA.

## Active accounts

| Role | Email | Notes |
| --- | --- | --- |
| Teacher | `bopbum114@gmail.com` | Production test teacher. Generated teacher code during verification: `Т268910`. |
| Student | `dmuduke@gmail.com` | Production test student for signup, login, and student bootstrap checks. |

## Intended usage

- Email signup and login verification on production
- Auth callback and confirmation-link checks
- Teacher/student role redirect checks
- Manual regression checks before release

## Automated production smoke

Credentials stay outside the repository. To run the non-mutating login/profile smoke with these accounts, provide them only through the current shell environment:

```powershell
$env:PLAYWRIGHT_BASE_URL = "https://selfreg-ai.vercel.app"
$env:SELFREG_PRODUCTION_TEACHER_EMAIL = "<teacher Gmail>"
$env:SELFREG_PRODUCTION_TEACHER_PASSWORD = "<teacher password>"
$env:SELFREG_PRODUCTION_STUDENT_EMAIL = "<student Gmail>"
$env:SELFREG_PRODUCTION_STUDENT_PASSWORD = "<student password>"
npx.cmd playwright test __tests__/e2e/production-auth-smoke.test.ts --workers=1
```

The smoke only signs in and opens the role-appropriate profile/dashboard. It must use the reserved accounts above and must not create, edit, archive, link, or delete data on production.
