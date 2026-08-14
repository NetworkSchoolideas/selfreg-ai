# SelfReg AI product development plan

This is the active, rolling plan for the next product-development sequence. It replaces urgency-driven release work with evidence-driven local iterations. Completed implementation detail belongs in Git history and `CODEX_HANDOFF.md`, not in a growing archive of obsolete plans.

## 1. Current baseline

The current release candidate is technically stable:

- authenticated student and teacher roles;
- a fixed five-stage self-regulation process;
- read-only teacher access to linked student sessions;
- isolated personal sessions for teachers;
- RU/EN interfaces and language-aware AI responses;
- persisted sessions and student feedback;
- unit, Playwright, build, GitHub Actions, Vercel, and Supabase release checks.

The next phase is therefore not a broad rewrite. It is a product-learning phase: observe realistic behaviour, identify friction, introduce one bounded improvement at a time, and keep only changes that improve the user journey without weakening the established safety and ownership model.

## 2. Product direction

SelfReg AI should become a calm, structured self-regulation companion rather than:

- a generic AI chat;
- a punitive habit tracker;
- a surveillance dashboard for teachers;
- a clinical or diagnostic product;
- a feature-heavy school management system.

The core promise remains:

> Help a learner turn a difficult situation into one understandable next step, while giving a linked teacher enough context for a useful conversation.

The five-stage psychological logic remains fixed unless a separate task explicitly reviews it. Product work may improve entry, explanation, recovery, continuity, presentation, and follow-up around that logic.

## 3. Patterns from adjacent successful products

These are product patterns to test, not features to copy wholesale.

| Case | Evidence-backed pattern | Application to SelfReg AI | Boundary |
| --- | --- | --- | --- |
| Duolingo | Lowering the minimum action required to maintain a learning habit improved retention; Duolingo also evaluates changes as controlled experiments and rejects changes that harm learning behaviour. [Streak experiment](https://blog.duolingo.com/improving-the-streak/), [experimentation process](https://blog.duolingo.com/improving-duolingo-one-experiment-at-a-time/) | Make the first useful action obvious and small. Separate “begin a useful session” from advanced setup such as a live API provider. Test one hypothesis per change. | Do not add guilt, public competition, loss-heavy streaks, or engagement mechanics unrelated to self-regulation. |
| Khanmigo | Khan Academy positions AI as guided support rather than an answer generator, combines student and teacher experiences, and improves the product through observations, interviews, feedback, and transcript analysis. [Recent learning process](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/), [learner-feedback iteration](https://blog.khanacademy.org/you-help-make-khanmigo-better-how-we-enhanced-our-ai-tutor-with-your-feedback/) | Keep the application in control of the process, let AI provide bounded scaffolding, and use real walkthroughs plus session evidence to refine response length, tone, and recovery. | AI must not decide the stage sequence, assess the learner clinically, or replace teacher judgement. |
| Along | Along reduces the teacher-student loop to “Ask, Reflect, Act” and makes student input useful for a later teacher action. [Product overview](https://www.along.org/wp-content/uploads/Welcome-to-Along.pdf) | Teacher analytics should answer “what could we discuss or support next?” rather than merely displaying records. Student ownership and read-only teacher access remain central. | Do not let the teacher edit, delete, or silently control the student’s session. |
| Daylio | Daylio combines very low-friction entries with private history, goals, and understandable longitudinal views. [Product overview](https://daylio.net/), [statistics guide](https://daylio.net/faq/docs/daylio-faq/about/activity-and-mood-statistics/) | Make completed sessions easier to revisit and compare. Show factual patterns and next actions without presenting them as diagnoses or causal conclusions. | Avoid mood scoring, unsupported correlations, and claims about wellbeing or mental health. |
| Finch | Finch explicitly frames repeated self-care as something that should meet the user where they are and not feel like a chore. [Product approach](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care) | If repeat-use mechanics are introduced, they should be optional, forgiving, and focused on continuation rather than failure. | No punishment for missed days and no dependency-forming reward loop. |

## 4. Operating model

Every product iteration follows the same sequence:

1. Identify one user problem from a realistic walkthrough, feedback, or production evidence.
2. Write one hypothesis and one primary success signal.
3. Record the current behaviour before changing code.
4. Make the smallest coherent change.
5. Add or update unit and goal-based Playwright coverage.
6. Run the changed journey manually in Browser on desktop and mobile, in Russian and English where language is relevant.
7. Run the applicable release checks.
8. Create one local commit.
9. Review the local result before any push.

Pushes are release decisions, not the default end of a task. Several approved local commits may be pushed as one reviewed release batch.

## 5. Sequential roadmap

### Phase 1 — Human-like baseline testing

**Goal:** discover product friction that deterministic regression tests do not expose.

Test the product through goal-based journeys rather than component-by-component clicking:

1. First-time Russian-speaking student: understand the product, register, consent, start in Mock mode, finish, find the result.
2. First-time English-speaking student: complete the same journey with no Russian leakage.
3. Returning student: resume after refresh, use clarification, go back, restart, switch language, archive a session, and start another.
4. Live-provider student: understand why a key is needed, configure it, recover from invalid/expired/unauthorised key responses, and continue without losing work.
5. First-time teacher: register, understand the code, link a student, inspect a session, remove only the dashboard link, and understand the read-only boundary.
6. Teacher personal use: start and resume a private exercise without mixing it with student data.
7. Interruption and recovery: refresh, browser back/forward, duplicate tabs, expired auth, slow API, failed save, empty state, and narrow mobile viewport.

For each journey record:

- whether the next action was obvious;
- time and number of decisions before the first useful step;
- places where the user had to understand internal terminology;
- dead ends, misleading success states, duplicate actions, and data-loss risks;
- accessibility risks visible from keyboard, focus, zoom, contrast, and responsive use;
- P0/P1/P2/P3 severity with exact reproduction.

**Exit criteria:**

- all seven journeys have a current desktop and relevant mobile result;
- no unresolved P0 data-loss/access issue;
- every P1 issue has a reproduction test or a named manual test;
- the top three product hypotheses are ranked by user impact and implementation risk.

### Phase 2 — Activation and first-session clarity

**Goal:** help a new user reach the first useful self-regulation step with minimal confusion.

Likely hypotheses, to be validated by Phase 1:

- make Mock mode the unmistakable safe first experience;
- defer live API configuration until the user asks for it or finishes a demonstration;
- replace setup explanations with contextual guidance at the moment it is needed;
- show the five-stage route and expected effort without overwhelming the start screen;
- distinguish clearly between student account work, teacher personal work, and teacher review.

**Primary signal:** a first-time user can explain what will happen and reach stage 1 without assistance.

**Guardrails:** registration, consent, role isolation, and provider-key safety must not weaken.

### Phase 3 — Session quality and recovery

**Goal:** make the five-stage exercise feel coherent under normal and imperfect use.

Priority areas:

- clarification that answers the current confusion without breaking the stage;
- Back that preserves relevant input and makes its effect clear;
- Start over that explains what is reset and what is preserved;
- provider failures that never masquerade as successful AI responses;
- useful loading, retry, offline, save-failure, and resume states;
- response length and reading complexity appropriate to the selected language and role;
- consistent completion language and a concrete next action.

**Primary signal:** users recover from common mistakes without losing their place or needing to understand implementation details.

### Phase 4 — Durable value after one session

**Goal:** give users a reason to return because prior work becomes useful.

Candidate improvements:

- a concise completed-session summary focused on the goal, chosen action, and adjustment;
- a student timeline that makes continuation and comparison understandable;
- factual cross-session patterns such as repeated stages or contexts, with uncertainty stated plainly;
- a clear “what I can do next” action from the dashboard;
- a teacher summary oriented toward a conversation prompt or support opportunity rather than raw record volume;
- clearer feedback capture about what helped, what confused, and what should change.

**Primary signal:** a returning student or teacher can identify the value of an earlier session within seconds.

**Guardrails:** no diagnosis, automated judgement, hidden teacher action, or unsupported causal claim.

### Phase 5 — Gentle repeat use

**Goal:** support continued practice without turning self-regulation into an obligation.

Only after Phase 4 demonstrates repeat value:

- optional personal cadence or reminder;
- forgiving continuation markers instead of reset-to-zero streaks;
- small completion acknowledgement;
- optional goal grouping or context labels;
- a weekly review that the user explicitly opens.

**Primary signal:** repeat use increases without users reporting pressure, guilt, or confusion.

### Phase 6 — Controlled product experiments

**Goal:** learn systematically once there is enough real usage to compare variants.

Before introducing A/B tests:

- define a privacy-minimal event vocabulary;
- document which events are operational and which would require consent or policy updates;
- exclude session answer text, API keys, emails, and student-identifying content;
- add reversible feature flags;
- define one primary metric and guardrail metrics per experiment;
- establish a rollback condition before rollout.

Until usage volume is sufficient, prefer moderated walkthroughs, five-user usability rounds, feedback ratings, support reports, and before/after task completion over statistically weak A/B conclusions.

## 6. Prioritised next iterations

The baseline, activation pass, core recovery work, and first returning-user improvements are now implemented. Continue in small reviewed iterations rather than reopening those phases broadly.

### Iteration 1 — production acceptance baseline

After each reviewed release batch, run the public application through the student and teacher test accounts in RU and EN. Cover desktop and 375px mobile for login, role routing, new and resumed sessions, clarification, Back, restart, completion, dashboard return, completed-session review, personal teacher use, and teacher read-only review.

**Done when:**

- GitHub `main`, the Vercel deployment, and `/api/health` identify the same revision;
- the public matrix records an explicit result for both roles and both languages;
- there are no unresolved P0 access-control or data-loss issues;
- every P1 has a deterministic regression or a named manual reproduction.

### Iteration 2 — live-provider recovery

Test invalid key, unauthorised model, timeout, provider outage, successful retry, and A→B clarification with a real opt-in key. Preserve the current answer and stage on every recoverable failure, and never present a fallback as a successful live response.

**Done when:** one goal-based E2E covers failure and recovery, RU/EN error copy is accurate, and no key appears in logs, screenshots, traces, storage outside the documented session scope, or Git.

### Iteration 2a — live-response contract and model suitability

**Goal:** make a live answer as focused and understandable as the fixed five-stage route, even when a freemium provider changes its available models.

The prompt contract is a product boundary, not a substitute for the scenario engine: the server continues to choose the stage and support scenario. The provider receives only the task of phrasing the already chosen support.

- keep one shared response contract across GigaChat, Groq and OpenRouter: selected interface language, 2–4 plain-language sentences, one concrete next action, no diagnosis, personality judgement, moralising, hidden reasoning or generic praise;
- accept only models that are appropriate for ordinary chat completion in the learner selector; exclude guard/safety-only models and models that are not suitable for Russian or English learner replies;
- treat an empty, malformed or internal-reasoning response as a failed live attempt: preserve the learner's input and stage, then offer retry or another provider;
- record the exact provider/model pair for a successful opt-in live walkthrough. Availability and quotas remain external and can change.

**Done when:** unit coverage exercises the shared contract and unusable-reply handling; the visible Groq list contains only session-suitable chat models; and RU plus EN opt-in live walkthroughs produce an understandable next action without changing the fixed stage or scenario.

#### Provider transition note (2026-08-13)

GitHub Models was retired by GitHub on 30 July 2026. It is retained only as a historical record value; it is not a selectable SelfReg provider, a default, or part of user guidance.

The immediate test path is OpenRouter with a user-owned key and explicit model check. `openrouter/free` is useful for opt-in prototype testing, but its free-model availability and rate limits are not a production service guarantee. A provider check succeeds only after a usable model response; a timeout, embedded routing error, or empty completion is a failed check and must preserve the learner's work.

GigaChat is a supported alternative for individual freemium use. Its Authorization Key is exchanged on the server with `GIGACHAT_API_PERS` for a short-lived OAuth access token; the browser does not call OAuth and does not keep the access token. New projects use `https://api.giga.chat/v1/chat/completions`. Server requests trust only the official Russian Trusted Root CA instead of disabling TLS verification.

Groq is the first supported reserve provider. It uses the OpenAI-compatible endpoint, a user-owned key, and the production open-weight model `openai/gpt-oss-20b`; its Free plan remains quota-limited. Do not describe hosted inference itself as open source: SelfReg uses open-weight models through a third-party service.

Provider policy after GitHub Models retirement:

| Provider | Product role | Free-use evidence | Decision |
| --- | --- | --- | --- |
| Mock | Guaranteed demonstration | Local and keyless | Always available; never labelled as a live model. |
| OpenRouter | Recommended live starting point | Free model routing with account-wide limits and variable upstream capacity | Supported, but every key/model pair must pass a real completion check. |
| GigaChat | RU-first alternative | Individual Freemium allowance, `GIGACHAT_API_PERS` | Supported with server-side OAuth and official CA trust. |
| Groq | Open-weight reserve | Published Free plan rate limits | Supported as an advanced option. |
| Cerebras | Excluded | Free access currently requires payment-method setup, which does not meet the project’s user-friendly free-BYOK policy | Not enabled or documented as a SelfReg provider. |
| SambaNova | Excluded | Free-account access could not be reproduced with a newly created official SambaCloud key | Not enabled or documented as a SelfReg provider. |
| Gemini API | Research candidate | Free tier exists, but free-tier content may be used to improve Google products | Not enabled for teen session content without a separate privacy decision. |
| Cloudflare Workers AI | Infrastructure candidate | Daily free neuron allocation | Not a simple personal-key route; defer until a Cloudflare account/Worker architecture is justified. |
| Hugging Face Inference Providers | Developer fallback | Very small monthly free credit | Insufficient as the default learner path. |

Any additional provider must be selected from an internal endpoint allowlist. SelfReg must not accept an arbitrary OpenAI-compatible base URL from the browser because that would turn the server route into an SSRF and key-exfiltration surface.

### Iteration 3 — returning-user comprehension

Run a fresh usability pass over the combined dashboard hierarchy: saved next action, latest active session, completed-session details, completion review, and personal hiding. Change only the first reproducible ambiguity.

**Done when:** a returning learner can identify what is unfinished, what is completed, and what will merely be hidden without assistance; the selected change has desktop/mobile Browser evidence and one regression.

### Iteration 3a — student session retention policy

**Goal:** keep the learner's dashboard useful without silently destroying their work or the completed history that supports reflection and teacher discussion.

Current product fact: **Hide session** already archives a session only from the student's dashboard through `studentArchivedAt`; it does not delete the session or remove it from the teacher. This is the right immediate control for clutter and remains the only student-facing action in this iteration.

Current implementation state: incomplete sessions remain resumable for 30 days and are then abandoned and hidden from the student dashboard. A daily server-side job persists that abandonment, and a second daily job physically deletes only qualifying incomplete sessions after 90 days. Completed sessions are never deletion candidates.

Applied retention policy:

1. Completed sessions remain stored and may only be hidden from the student's dashboard. They are retained for the learner's review and linked teacher's read-only discussion context.
2. Incomplete or draft sessions remain resumable for 30 days after their last update. After that, they become abandoned and are hidden from the student dashboard by default.
3. Physical deletion of abandoned incomplete sessions happens no earlier than 90 days after their last update, through a separately reviewed server-side cleanup task. It must never delete completed sessions, teacher links, or data from another user.
4. A future **delete my data** action is a separate account-level feature with explicit confirmation, clear scope, and audited ownership checks; it is not part of the dashboard's Hide action.

**Primary signal:** a returning student can find an active session or a useful completed result without being distracted by stale partial attempts.

**Guardrails:** no automatic deletion in a client browser; no teacher-driven deletion; no deletion of completed sessions; retention jobs act only on incomplete sessions with no final note and remain covered by owner/teacher-boundary regressions.

**Scheduler state:** `pg_cron` is active with two named daily jobs: one marks stale incomplete sessions and one purges eligible abandoned sessions. On the Free plan this is best-effort while the project is active: a paused project cannot promise a calendar-exact run. The immediate product guarantee remains timestamp-based dashboard hiding; the scheduled job provides eventual retention cleanup.

**Done when:** a manual student dashboard test verifies Hide remains non-destructive; deterministic tests classify the 30-day and 90-day boundaries; both Cron jobs have a successful `cron.job_run_details` entry; and the audit, rollback, and Free-plan limitation are documented.

### Iteration 4 — teacher conversation workflow

Validate the complete teacher route: personal code, student connection, student selection, read-only chronology, conversation prompt, personal session, and removing a student only from the teacher dashboard. Keep student-owned sessions unchanged.

**Done when:** the teacher can explain the boundary between observation, personal work, and student ownership; owner/linked-teacher API tests and the public manual journey agree.

### Iteration 4a — teacher-side optional AI conversation preparation

**Goal:** assess whether a teacher can request a concise conversation preparation note without turning the teacher cabinet into a diagnostic tool or weakening student ownership.

The first implementation increment adds a teacher-local provider-key panel and an explicit “prepare conversation questions” action for one selected completed session. The server re-fetches and authorizes that teacher–student link, then sends only a minimal process summary: the session context, stage-completion state and aggregate interaction signals. It never sends a learner name, email, identifier, raw answer or feedback. The one-shot result is not persisted and cannot modify or delete student data.

The subsequent conversation-preparation request is opt-in and must retain these boundaries:

- the teacher explicitly selects a completed session or an aggregate, factual view;
- the teacher supplies and checks their own provider key in a separate personal setting;
- the request is opt-in, one-shot, and never writes an AI conclusion back into the student's session;
- the prompt contains the minimum necessary session context and process signals; API keys, email addresses, hidden student identifiers, raw answers and feedback never leave the server boundary;
- the output is framed as conversation prompts and observable facts, never clinical analysis, diagnosis, scoring, or an automated judgement;
- the teacher can discard the result and continue using the read-only cabinet without a provider key.

**Primary signal:** a teacher can explain what the generated note is for, what it does not claim, and how to discard it.

**Exit criteria:** a reviewed threat/privacy note, the teacher-local key panel verified in RU and EN, a minimal server-side allowlist design, and a separate approval before transmitting raw student content or creating cross-learner interpretation. A later group tool may use de-identified aggregates only.

### Iteration 5 — moderated product learning

Conduct a small round of realistic walkthroughs with new users before adding engagement mechanics. Rank observed friction by task impact, frequency, and implementation risk; select one hypothesis for the next local commit.

**Done when:** evidence from the walkthroughs selects the next change, and no reminder, streak, scoring, diagnosis, or analytics feature is added without a separate validated need.

## 7. Backlog boundaries

Not in the near sequence:

- a broad visual redesign;
- social feeds, public profiles, rankings, or competitive leaderboards;
- clinical scoring, diagnosis, crisis support, or therapeutic claims;
- teacher editing or deletion of student-owned sessions;
- AI-controlled stage selection or free-form replacement of the five-stage process;
- large analytics or telemetry infrastructure before the questions it must answer are defined;
- direct production experiments without a reviewed local commit and release decision.

## 8. Quality gate

For implementation commits:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test:unit -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
```

Documentation-only commits require at minimum `git diff --check` and link/content review. UI changes additionally require the affected journey in Browser at desktop and mobile widths.
