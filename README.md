# SelfReg AI — Intelligent Self-Regulation Support System

A Next.js 16 application for adolescent self-regulation support with a teacher dashboard. Bilingual (RU/EN), works with or without AI (Mock mode), supports BYOK (Bring Your Own Key).

## 🚀 Features

### For Adolescents
- ✅ 5-stage self-regulation cycle (Goal → Move to action → Feedback → Comparison → Adjustment)
- ✅ A/B scenario system (normal support vs pressure/self-attack support)
- ✅ Clarification flow for ambiguous answers
- ✅ Session history with AI-powered insights
- ✅ BYOK — choose your AI provider (Mock, GigaChat, OpenRouter, GitHub Models, Vercel Gateway)

### For Teachers
- ✅ Dashboard with student list and real-time analytics
- ✅ Class distribution and student progress visualization
- ✅ Detailed session records per student
- ✅ A/B scenario distribution tracking
- ✅ CSV export of all data
- ✅ Copy shareable links for students

### Technical
- ✅ Bilingual (RU/EN) — all pages support both languages
- ✅ Works with or without AI (Mock mode)
- ✅ BYOK — user brings their own API key
- ✅ localStorage (default) + Supabase (optional) storage
- ✅ Mobile-first responsive design (tablet + mobile breakpoints)
- ✅ TypeScript strict mode
- ✅ Next.js 16 App Router with proxy.ts
- ✅ Unit tests (Jest) + E2E tests (Playwright)
- ✅ CI pipeline (GitHub Actions)

## 📁 Project Structure

```
selfreg-ai/
├── app/                          # Next.js App Router
│   ├── adolescent/               # Self-regulation session prototype
│   │   ├── AdolescentPrototype.tsx
│   │   └── useAdolescentSession.ts
│   ├── teacher/                  # Teacher routes
│   │   ├── TeacherDashboard.tsx   # Main teacher dashboard (working)
│   │   ├── register.tsx          # Teacher registration
│   │   ├── register-success.tsx  # Post-registration with teacher code
│   │   └── dashboard/            # Dashboard pages
│   ├── student/dashboard/        # Student dashboard
│   ├── auth/                     # Auth pages (login, register)
│   ├── role-selection/           # Role selection page
│   ├── settings/                 # Settings page
│   ├── components/               # Shared components
│   │   ├── ApiKeyManager.tsx     # BYOK key management
│   │   ├── OnboardingModal.tsx   # First-time onboarding
│   │   ├── LanguageToggle.tsx    # RU/EN switcher
│   │   ├── AuthButton.tsx        # Auth state button
│   │   ├── ErrorBoundary.tsx     # Error boundary wrapper
│   │   └── ...
│   └── api/                      # API routes
│       ├── chat/                 # AI chat endpoint
│       ├── children/             # Children CRUD
│       ├── sessions/             # Sessions CRUD
│       ├── provider-check/       # AI provider health check
│       └── ...
├── components/analytics/         # Analytics components
│   ├── ClassStats.tsx
│   └── ProgressChart.tsx
├── hooks/                        # Custom React hooks
│   ├── useSessionSubmit.ts       # Session submission logic
│   ├── useSessionHistory.ts      # Session history loading
│   ├── useAuth.ts                # Auth state management
│   └── useSupabaseAuth.ts        # Supabase auth integration
├── lib/                          # Core libraries
│   ├── selfreg-model.ts          # 5-stage self-regulation model
│   ├── scenario-engine.ts        # A/B scenario detection
│   ├── selfreg-flow-machine.ts   # Flow state machine
│   ├── data-service.ts           # Unified data layer (Supabase + localStorage)
│   ├── children-storage.ts       # Children storage (localStorage)
│   ├── session-manager.ts        # Session management
│   ├── app-i18n.ts               # Bilingual i18n system
│   ├── provider-registry.ts      # AI provider registry
│   └── ...
├── services/                     # Service layer
│   └── ai-service.ts             # AI service (all providers)
├── types/                        # TypeScript types
│   ├── session.ts
│   └── supabase.ts
├── __tests__/                    # Test files
│   ├── unit/                     # Jest unit tests
│   └── e2e/                      # Playwright E2E tests
├── .github/workflows/            # CI pipeline
│   └── ci.yml
├── supabase/                     # Database migrations
│   └── migrations/
└── styles/                       # Global styles
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16.2.6 (App Router)
- **Language:** TypeScript (strict mode)
- **Storage:** localStorage (default) + Supabase (PostgreSQL, optional)
- **Auth:** Supabase Auth (optional, email/password + Google)
- **AI Providers:** Mock (no AI), GigaChat, OpenRouter, GitHub Models, Vercel Gateway
- **Styling:** Custom CSS (mobile-first, two breakpoints: 1024px tablet, 768px mobile)
- **Testing:** Jest (unit) + Playwright (E2E)
- **CI:** GitHub Actions (lint → typecheck → test → build)

## 📦 Installation

```bash
# Clone repository
git clone <repository-url>
cd selfreg-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (optional)

# Run development server
npm run dev

# Build for production
npm run build
```

## 🧪 Testing

```bash
# Run unit tests (Jest)
npm run test:unit

# Run all tests
npm test

# Test with coverage
npm run test:coverage

# E2E tests (requires Playwright browsers)
npm run test:e2e
```

## 🔐 Environment Variables

```env
# Supabase (optional — app works with localStorage without it)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_ENABLED=false
```

## 🌐 Bilingual Support

All pages support Russian (default) and English. Use the `LanguageToggle` component to switch. The `normalizeAppLang()` function from `lib/app-i18n.ts` detects the user's language preference.

## 🤖 AI Providers (BYOK)

The app works with or without AI. In Mock mode, no API key is needed. Users can bring their own key for:
- **GigaChat** — Russian AI provider
- **OpenRouter** — Multi-model gateway
- **GitHub Models** — GitHub's AI models
- **Vercel Gateway** — Vercel's AI gateway

Provider selection and key management happen on the session page, not during registration.

## 📖 Documentation

- [Architecture Overview](ARCHITECTURE.md) — Data flow, storage layers, component design
- [Testing Guide](TESTING.md) — How to run and write tests
- [Deployment Guide](DEPLOYMENT.md) — Deploy to production
- [Setup Guide](supabase/SETUP.md) — Database and Supabase setup
- [RLS Policies](supabase/README.md) — Security policies

## 🎯 User Flow

### Adolescent (Self-Regulation Session)
1. Visit `/adolescent`
2. Enter context (optional) or start immediately
3. Choose AI provider (or use Mock mode)
4. Go through 5 stages of self-regulation
5. Receive A/B scenario support based on answers
6. View session history with AI insights

### Teacher
1. Visit `/role-selection` → select "Teacher"
2. Register (or use existing teacher dashboard at `/teacher`)
3. Add students manually or share links
4. View dashboard with analytics and session records
5. Export data to CSV

## 🔒 Security

- Row Level Security (RLS) on Supabase tables (when Supabase is enabled)
- API keys stored in localStorage (client-side only)
- No server-side storage of user API keys
- Error boundaries on all pages

## 📊 Analytics

### Teacher Dashboard
- Total students, sessions, classes
- Class distribution chart
- Student progress tracking
- A/B scenario distribution
- Stage-by-stage support analysis
- Session signals (clarifications, returns, retries)

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📄 License

MIT License

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**