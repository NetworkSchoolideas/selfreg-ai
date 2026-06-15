# Phase 6.3 — Onboarding for New Users

## Goal

Add an onboarding flow that explains the SelfReg AI system to first-time users. The onboarding should appear when a user first visits the adolescent prototype or teacher dashboard, and should be dismissable with localStorage persistence.

## Current State

- The project already has a modal pattern: `.modal-overlay`, `.modal-content`, `.modal-close` CSS classes in `app/globals.css` (lines 768-800)
- `EmailAuthModal.tsx` uses this pattern — the onboarding modal should follow the same approach
- `AdolescentPrototype.tsx` uses a `useUiText` hook for bilingual content — the onboarding modal should have its own bilingual content
- `TeacherDashboard.tsx` uses `normalizeAppLang` from `lib/app-i18n`

## Implementation Plan

### Files to Create
1. **`app/components/OnboardingModal.tsx`** — reusable modal component

### Files to Modify
2. **`app/adolescent/AdolescentPrototype.tsx`** — add onboarding check + modal on first mount
3. **`app/teacher/TeacherDashboard.tsx`** — add onboarding check + modal on first mount
4. **`app/globals.css`** — add `.onboarding-body` CSS class for step layout (reuse existing `.modal-overlay`, `.modal-content`, `.modal-close`)

### Files NOT to Modify
- `app/HomeClient.tsx` — no changes needed (landing page, not a tool)
- `app/role-selection/page.tsx` — no changes needed
- `app/auth/*` — no changes needed

---

## Detailed Steps

### Step 1: Create `app/components/OnboardingModal.tsx`

```tsx
"use client";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "ru" | "en";
  type: "adolescent" | "teacher";
}
```

**Pattern**: Follow `EmailAuthModal.tsx` pattern:
- Use existing `.modal-overlay` + `.modal-content` + `.modal-close` CSS classes
- Close on overlay click (with `e.stopPropagation()` on content)
- Close button (×) in top-right corner
- "Got it" button in footer

**Content** (bilingual, inline in component — no separate hook needed):

**Adolescent content** (5 steps):
1. 🎯 **Goal** — Set a goal for a real situation
2. 🏃 **Move to action** — Plan concrete steps
3. 💬 **Feedback** — Get AI feedback on your plan
4. 🔍 **Comparison** — Compare your plan with recommendations
5. 🔧 **Adjustment** — Adjust based on feedback

Plus explanation of:
- A/B scenarios: different support patterns
- Clarification: you can ask AI to rephrase questions
- Mock mode: works without AI

**Teacher content** (5 steps):
1. 👥 **Students** — Add students on the left panel
2. 📊 **Analytics** — View class-wide statistics and progress
3. 📋 **Sessions** — Each student's sessions show 5-stage progress
4. 🔄 **Scenarios** — A/B scenarios show different support patterns
5. 📤 **Export** — Export data via CSV

### Step 2: Add CSS to `app/globals.css`

Add **before** the `@media` query (around line 1492):

```css
/* Onboarding modal body */
.onboarding-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.onboarding-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.onboarding-step-icon {
  font-size: 24px;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}
.onboarding-step-text {
  font-size: 14px;
  line-height: 1.5;
}
.onboarding-step-title {
  font-weight: 600;
  margin-bottom: 2px;
}
.onboarding-footer {
  margin-top: 24px;
  text-align: center;
}
```

**Note**: Reuse existing `.modal-overlay`, `.modal-content`, `.modal-close` classes. The `.modal-content` max-width is 400px — we need to override it for the onboarding modal (wider, ~520px). This can be done with an inline `style={{ maxWidth: 520 }}` on the `.modal-content` div, or by adding a `.modal-content-wide` class.

### Step 3: Modify `app/adolescent/AdolescentPrototype.tsx`

**Changes**:
1. Add import: `import { OnboardingModal } from "@/app/components/OnboardingModal";`
2. Add state: `const [showOnboarding, setShowOnboarding] = useState(false);`
3. Add `useEffect` on mount (empty deps `[]`):
   ```tsx
   useEffect(() => {
     const seen = localStorage.getItem("selfreg_onboarding_seen_adolescent");
     if (!seen) setShowOnboarding(true);
   }, []);
   ```
4. In the return, render `<OnboardingModal>` as the **first child** inside `<main className="shell">` (before the topbar):
   ```tsx
   <OnboardingModal
     isOpen={showOnboarding}
     onClose={() => {
       localStorage.setItem("selfreg_onboarding_seen_adolescent", "1");
       setShowOnboarding(false);
     }}
     lang={lang}
     type="adolescent"
   />
   ```

### Step 4: Modify `app/teacher/TeacherDashboard.tsx`

**Changes**:
1. Add import: `import { OnboardingModal } from "@/app/components/OnboardingModal";`
2. Add state: `const [showOnboarding, setShowOnboarding] = useState(false);`
3. Add `useEffect` on mount (empty deps `[]`):
   ```tsx
   useEffect(() => {
     const seen = localStorage.getItem("selfreg_onboarding_seen_teacher");
     if (!seen) setShowOnboarding(true);
   }, []);
   ```
4. In the return, render `<OnboardingModal>` as the **first child** inside `<main className="shell">` (before the topbar):
   ```tsx
   <OnboardingModal
     isOpen={showOnboarding}
     onClose={() => {
       localStorage.setItem("selfreg_onboarding_seen_teacher", "1");
       setShowOnboarding(false);
     }}
     lang={lang}
     type="teacher"
   />
   ```

**Note**: `TeacherDashboard.tsx` uses `normalizeAppLang` from `lib/app-i18n` — the `lang` variable is already available in the component scope.

---

## Testing

1. Visit `/adolescent` for the first time → onboarding modal should appear
2. Dismiss it → should not appear again on reload
3. Visit `/teacher` for the first time → onboarding modal should appear
4. Dismiss it → should not appear again on reload
5. Clear localStorage → modals should reappear
6. Build check: `npm run check:full`

---

## Mermaid Diagram

```mermaid
flowchart TD
    A[User visits /adolescent or /teacher] --> B{localStorage flag set?}
    B -->|No| C[Show OnboardingModal]
    B -->|Yes| D[Show normal content]
    C --> E[User clicks Got It / Close]
    E --> F[Set localStorage flag]
    F --> D