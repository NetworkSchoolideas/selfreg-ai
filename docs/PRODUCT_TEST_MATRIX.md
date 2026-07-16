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

## Phase 4 implementation result

The student dashboard now places a **The next step you chose** card before aggregate counts and history selection. It reads only the newest visible completed session in the current dashboard language and displays the learner's saved stage-5 adjustment together with that session's context and completion date. It does not create a recommendation, write data, alter teacher access, or reveal a session saved in another language.

Automated coverage proves that archived sessions and another-language sessions are skipped and that the newest eligible saved adjustment is selected. Local signed-in student browser QA confirmed the card on desktop and at 360px without horizontal overflow or console diagnostics.

## Phase 4 follow-up discovery

The new card makes the completed-session value immediate. In the same returning-student view, however, the status reports multiple unfinished sessions while the only direct action near the top is **New session**; continuing requires scanning the history and choosing one of several repeated **Continue** controls. The paired teacher review already leads to a selected session and a neutral conversation prompt, so this is a student return-path issue rather than a teacher-dashboard change.

Selected next hypothesis: when an eligible active student session exists, make the newest one directly resumable from the status area and identify it by its saved context and last activity. The learner remains in control: the action opens the existing session but does not auto-resume, change the draft, create data, or affect teacher access. The primary signal is that a returning learner with unfinished work reaches the correct active session in one clear decision rather than searching the history.

## Phase 4 active-session resume result

The dashboard now surfaces the newest visible, language-compatible active session in the status area with its context, last activity, and one **Continue** action. Only sessions with a saved id are eligible, so the action always targets an existing resumable route; legacy records without an id remain in history only.

The implementation also corrected a route-initialisation race: a saved session is now marked as initialized only after its profile fetch has completed and its restore/reset action has run. This keeps a direct resume link from opening a blank fresh session when effects are restarted during initial loading. A targeted Playwright regression seeds an active student-owned session, follows the dashboard action, and confirms the restored second stage. Signed-in local Browser QA passed on desktop and at 360px, including direct restoration of an existing active session and no horizontal overflow or console diagnostics.

## Phase 4 return-action hierarchy result

Reviewing the combined dashboard revealed that the direct resume path was still visually secondary to **New session**. When unfinished work exists, the dashboard now makes **Continue** the primary top action, keeps **New session** available as a secondary action, and preserves Home. The status card continues to explain which saved session will open; no session is opened automatically and no student or teacher data is changed.

The action bar wraps at narrow widths. A targeted Playwright regression follows the top-level resume action and confirms that it restores the saved second stage. Local signed-in Browser QA confirmed the three-action hierarchy at desktop and 360px, direct restoration of the existing session, no horizontal overflow, and no console diagnostics.

## Phase 4 active-session action clarity result

The new primary action was initially just **Continue**, immediately above the completed-session card. That wording could suggest returning to the completed session rather than the separate unfinished one. The action now says **Continue latest active session** (and its Russian equivalent), while the status card retains the selected context and last activity. The route and selection logic are unchanged.

The same mobile review exposed a clipped dashboard header: the signed-in identity, logout control, and language switcher stayed on one horizontal row. The header now wraps deliberately at narrow widths, so those controls remain visible. Local Browser QA confirmed the updated English and Russian wording, a readable 360px layout, no horizontal overflow, and no console diagnostics.

## Phase 4 feedback ownership result

The completion screen already had optional feedback intended for a linked teacher, but its save path inferred a target from session recency. With more than one session, that could place feedback on a different session than the completed one the learner had just reviewed. The form now sends the current completed session id; local storage and the protected server route both update that exact completed record. Legacy requests without an id retain the existing latest-completed fallback for history insights.

The form is now shown only when a student is linked to a teacher, and its copy names only the actual teacher role. This prevents a standalone student from being told that an unavailable recipient will receive their feedback. Focused storage and route tests cover the selected-session update; local Browser QA completed a linked student Mock session and confirmed the corrected form on the completion screen.
