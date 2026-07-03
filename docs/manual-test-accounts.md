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
