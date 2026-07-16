# Product-like baseline matrix

This matrix records an observed local baseline before a bounded product fix. It is not a substitute for the release gate in [TESTING.md](../TESTING.md). Test accounts, identifiers, answers, teacher codes, API keys, and feedback text are intentionally excluded.

## Baseline scope

| ID | Journey | Status | Evidence | Follow-up |
| --- | --- | --- | --- | --- |
| U01 | First-time student, Russian | Pass with issue | The entry, registration prompt, five-step route, and Mock mode are understandable; the default GitHub Models choice appears before a key is configured. | Track P1-02 as activation friction. |
| U02 | First-time student, English | Pass | English entry and registration render in English; the mobile form has no horizontal overflow. | Keep in regression coverage. |
| U03 | Returning student: resume, Back, clarification, restart, language | Partial | Back preserved a draft. Clarification removed a draft before the explicit clear action. Restart reset a personal session correctly. | Fix P1-01 before expanding this route. |
| U04 | Provider key setup and error recovery | Pending by design | Mock mode was checked without a key. A live-key run is opt-in and was not performed in the baseline. | Run only with a temporary user-supplied key. |
| U05 | Teacher linking, review, and dashboard | Pass with observation | Linked-session review and feedback display work; teacher controls do not expose deletion of student sessions. | Use P2-04 in a later dashboard-focused task. |
| U06 | Teacher personal session | Pass | Personal route is explicitly browser-only, does not enter student analytics, and Start over resets its local draft. | Keep in regression coverage. |
| U07 | Interruption recovery and mobile | Pass with observation | RU/EN pages had no horizontal overflow at mobile width and no console errors were observed. English teacher transition briefly displayed stale RU content before hydration. | Reproduce P3-05 in a production build before treating it as a defect. |

## Issue ledger

| ID | Priority | Finding | Status | Next action |
| --- | --- | --- | --- | --- |
| P1-01 | P1 | Requesting clarification clears the current typed answer automatically, although the UI has a separate **Clear and retry** action. | Fixed locally and verified | Monitor in the next baseline; the explicit clear action remains covered. |
| P1-02 | P1 | The first student screen selects GitHub Models while no key is present, making a usable no-key flow look unavailable. | Fixed locally and verified | Mock is now the initial no-key mode; keep live providers available as an explicit choice. |
| P2-03 | P2 | Russian completion copy has the grammatical error “от цель к действию”. | Fixed locally and verified | A unit contract protects the correct phrase “от цели к действию”. |
| P2-04 | P2 | Teacher dashboard leads with database/technical framing rather than an observation-to-conversation workflow. | Fixed locally and targeted-verified | The student, their sessions, and a neutral conversation prompt now precede aggregate analytics; preserve the read-only boundary in future checks. |
| P3-05 | P3 | Teacher language transition can briefly show the previous language before client state settles. | Not reproduced in production build | RU↔EN navigation was clean on desktop and 375px mobile; do not add a loading boundary without new evidence. |
| P3-06 | P3 | Generic context presets can look like retained personal data on a fresh route. | Fixed locally and verified | The initial value is explicitly labelled as a replaceable starting example, not saved personal context. |

## Automated counterpart

The release suite already covers authentication, student and teacher routes, completion, Back, restart, resume, language switching, feedback, personal teacher sessions, responsive layout, and key UI without storing secrets. The next test addition is intentionally narrow: a learner draft must remain after requesting clarification and clear only after the explicit action.

## Next bounded task

P1-01 is complete. Its done criteria were:

1. Requesting clarification preserves the current draft in the text area and session snapshot.
2. **Clear and retry** remains the only action that removes the draft.
3. A focused Playwright regression test passes, followed by the standard release gate.

## Phase 4 discovery selection

The walkthrough found that a completed session already stores a concise summary and a proposed adjustment, but the student dashboard makes the learner select a session before reaching that value. Its visible next-step card is necessarily generic. The selected hypothesis is: **surface the latest completed session's own manageable next action before aggregate counts and history selection.**

Primary signal: a returning student can identify what they chose to do next from the latest completed session within seconds. Guardrails: use only the student's existing saved session content, state the session date/context, and add no diagnosis, scoring, persistence, or AI-generated interpretation.
