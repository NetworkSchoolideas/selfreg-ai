# SelfReg AI - Intelligent Teacher-Student Management System

A Next.js 16 application with Supabase authentication for managing teacher-student relationships, tracking learning sessions, and visualizing analytics.

## 🚀 Features

### For Teachers
- ✅ Register and get unique teacher code
- ✅ Dashboard with student list
- ✅ Real-time analytics and statistics
- ✅ Class distribution visualization
- ✅ Student progress tracking
- ✅ Detailed student profiles

### For Students
- ✅ Register with teacher code
- ✅ Personal profile and dashboard
- ✅ Session history view
- ✅ Progress tracking

### Technical
- ✅ Supabase authentication (email/password)
- ✅ Row Level Security (RLS) policies
- ✅ Mobile responsive design
- ✅ TypeScript for type safety
- ✅ Next.js App Router
- ✅ Server-side data fetching

## 📁 Project Structure

```
selfreg-ai/
├── app/                      # Next.js App Router
│   ├── role-selection/       # Role selection page
│   ├── teacher/              # Teacher routes
│   │   ├── register.tsx      # Teacher registration
│   │   └── dashboard/        # Teacher dashboard
│   ├── student/              # Student routes
│   │   └── dashboard/        # Student dashboard
│   ├── adolescent/           # Student registration prototype
│   └── api/                  # API routes
├── components/
│   └── analytics/            # Analytics components
│       ├── ClassStats.tsx
│       └── ProgressChart.tsx
├── lib/                      # Utilities and helpers
├── supabase/                 # Database migrations
│   └── migrations/
├── __tests__/                # Test files
└── styles/                   # Global styles
```

## 🛠️ Tech Stack

- **Framework:** Next.js 16.2.6
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Custom CSS (mobile-first)
- **Testing:** Vitest (structure ready)

## 📦 Installation

```bash
# Clone repository
git clone <repository-url>
cd selfreg-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test:unit
```

## 🔐 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key (server functions only)
```

## 📖 Documentation

- [Setup Guide](supabase/SETUP.md) - Database and Supabase setup
- [RLS Policies](supabase/README.md) - Security policies
- [Testing Guide](TESTING.md) - How to run tests
- [Deployment Guide](DEPLOYMENT.md) - Deploy to production

## 🎯 User Flow

### Teacher
1. Visit `/role-selection`
2. Select "Teacher"
3. Register with email/password
4. Get unique teacher code (e.g., T123456)
5. Access dashboard at `/teacher/dashboard`
6. Share teacher code with students

### Student
1. Visit `/role-selection`
2. Select "Student"
3. Register with email/password
4. Enter teacher code when prompted
5. Access dashboard at `/student/dashboard`
6. View profile and session history

## 🔒 Security

- Row Level Security (RLS) enforced on all tables
- Teachers can only access their students' data
- Students can only access their own data
- Authentication required for protected routes
- Secure session management

## 📊 Analytics

### Class Distribution
- Bar chart showing student distribution across classes
- Color-coded for easy visualization
- Responsive design

### Student Progress
- Progress bars for each student
- Session completion rates
- Average scores (when available)
- Last activity tracking

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Watch mode
npm run test:watch

# E2E tests (requires Playwright)
npm run test:e2e
```

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📈 Roadmap

- [ ] Advanced analytics with charts
- [ ] Export data to CSV/PDF
- [ ] Email notifications
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced student grouping
- [ ] Homework assignments
- [ ] Parent portal

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

Developed by NLP-Core-Team

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Supabase for backend-as-a-service
- Vercel for hosting and deployment

---

**Built with ❤️ using Next.js and Supabase**