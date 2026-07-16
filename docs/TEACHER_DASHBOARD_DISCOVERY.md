# Teacher dashboard: observation-to-conversation hierarchy

## Decision

The teacher workspace is a read-only preparation surface for a respectful conversation with a linked student. It is not a database manager, a surveillance screen, or a diagnostic tool.

## First-screen hierarchy

1. **Choose the student.** Show the link code and linked students without exposing technical storage status as a product feature.
2. **Orient to the latest session.** Lead with its context, date, completed stages, and whether the learner asked for clarification, returned, retried, or skipped a step.
3. **Prepare one next conversation.** Offer neutral prompts such as “what felt clearer after you returned to the question?” rather than labels about a learner's ability or condition.
4. **Read the session.** Keep the chronological answers and AI support visible and clearly marked as the student's record.
5. **Inspect patterns only when needed.** Move aggregate counts, distribution bars, export, technical provider data, and class-level statistics below the primary session work.

## Content rules

- Describe actions in a session, never traits of a student.
- Treat clarifications, returns, and retries as usable process signals, not failures.
- Preserve the student's ownership: teacher removal hides only the teacher's dashboard link and never deletes the student session.
- Keep personal teacher practice separate from linked-student review.
- Do not introduce new psychological interpretation, scoring, or recommendations without a separately reviewed product task.

## Smallest implementation hypothesis

Replacing the database/infographic framing with an observation-to-conversation lead block will help a teacher move from a selected session to a calm, concrete follow-up discussion.

Before implementation, manually compare the current and proposed order with a teacher account in Russian and English, including empty, active, archived, and clarification/retry sessions. The change should remain read-only and must not alter session data or access control.
