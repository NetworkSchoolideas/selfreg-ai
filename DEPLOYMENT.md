# Deployment Guide - SelfReg AI

## Quick Deploy

### Vercel (Recommended)

1. **Connect GitHub Repository**
   - Push code to GitHub
   - Import repository in [Vercel Dashboard](https://vercel.com/new)

2. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_key (for server functions)
   ```

3. **Deploy**
   - Vercel auto-detects Next.js
   - Click "Deploy"
   - Done! 🎉

### Manual Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

## Environment Setup

### Required Variables

| Variable | Description | Where to get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | Supabase Dashboard → Settings → API |

### `.env.local` Template

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Database Setup

### 1. Create Tables

Run in Supabase SQL Editor:

```sql
-- Teachers table
CREATE TABLE teachers (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  teacher_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children table
CREATE TABLE children (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) NOT NULL,
  session_date TIMESTAMPTZ DEFAULT NOW(),
  duration INTEGER,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Apply RLS Policies

Run the migration from `supabase/migrations/001-rls-policies.sql`

### 3. Enable Authentication

- Go to Authentication → Providers
- Enable Email provider
- Disable email confirmation (for dev)

## Production Checklist

### Before Deploy

- [ ] Set all environment variables
- [ ] Apply database migrations
- [ ] Enable RLS policies
- [ ] Test user registration flow
- [ ] Test teacher-student linking
- [ ] Verify analytics load
- [ ] Check mobile responsiveness
- [ ] Review error logs

### Post-Deploy

- [ ] Monitor Vercel analytics
- [ ] Set up error tracking (Sentry)
- [ ] Configure custom domain (optional)
- [ ] Set up SSL certificates
- [ ] Configure backup strategy

## Monitoring

### Vercel Analytics

- View in Vercel Dashboard → Analytics
- Track:
  - Page views
  - Performance metrics
  - Geographic distribution

### Error Tracking

Recommended: Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

## Scaling

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_children_teacher ON children(teacher_id);
CREATE INDEX idx_sessions_child ON sessions(child_id);
CREATE INDEX idx_teachers_code ON teachers(teacher_code);
```

### CDN Configuration

Vercel auto-configures CDN. For custom:
- Enable edge caching
- Configure cache headers
- Set up image optimization

## Troubleshooting

### Common Issues

**Build fails:**
```bash
npm run build  # Check errors locally first
```

**Supabase connection error:**
- Verify environment variables
- Check Supabase project status
- Validate API keys

**RLS blocking access:**
- Review policies in Supabase Dashboard
- Check user roles in profiles table
- Test with service_role key for debugging

**Mobile layout broken:**
- Clear browser cache
- Check viewport meta tag
- Verify CSS media queries

## Support

- Docs: [vercel.com/docs](https://vercel.com/docs)
- Supabase: [supabase.com/docs](https://supabase.com/docs)
- Next.js: [nextjs.org/docs](https://nextjs.org/docs)