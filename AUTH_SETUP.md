# Supabase Auth Setup Guide

## Overview

This document explains how to configure Supabase Auth with Google OAuth for the SelfReg AI project.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Signs In                            │
│                  (Google OAuth Button)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Authentication                        │
│  - OAuth flow with Google                                   │
│  - Creates/updates user in auth.users                       │
│  - Trigger creates profile in profiles table                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Role-Based Redirect                            │
│  - Teacher (@school.ru, @edu.ru) → /teacher                 │
│  - Student (all others) → /adolescent                       │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### New Files
1. **`lib/supabase-auth.ts`** - Auth API wrapper
   - `signInWithGoogle()` - Google OAuth
   - `signInWithEmail()` - Email/Password
   - `signUpWithEmail()` - Registration
   - `signOut()` - Logout
   - `getUserProfile()` - Fetch user role
   - `isUserTeacher()` - Role check

2. **`hooks/useSupabaseAuth.ts`** - React hook for auth state
   - Manages session and user profile
   - Listens to auth state changes
   - Handles mock mode fallback

3. **`app/components/AuthButton.tsx`** - UI component
   - Sign in button (Google OAuth)
   - User profile display
   - Sign out button

4. **`app/api/auth/callback/route.ts`** - OAuth callback handler
   - Exchanges OAuth code for session
   - Redirects based on user role

### Modified Files
1. **`supabase-schema.sql`** - Added profiles table
   - Role field (teacher/student)
   - Trigger for auto-creation on signup
   - RLS policies

2. **`app/HomeClient.tsx`** - Added AuthButton to header

3. **`.env.local`** - Added auth configuration notes

4. **`README.md`** - Added auth documentation

## Setup Steps

### 1. Deploy Database Schema

Run `supabase-schema.sql` in Supabase SQL Editor:

```sql
-- This creates:
-- - profiles table
-- - auto-creation trigger
-- - RLS policies
-- - Role detection based on email domain
```

### 2. Configure Google OAuth in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**
2. Click **Google** provider
3. Enable the provider
4. Add Google Cloud credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)

### 3. Configure Authorized Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

Add these redirect URLs:
```
Development:
http://localhost:3000/api/auth/callback

Production:
https://your-domain.vercel.app/api/auth/callback
```

### 4. Add Environment Variables

`.env.local` already contains Supabase credentials. No changes needed.

### 5. Test the Integration

1. Start dev server: `npm run dev`
2. Go to [http://localhost:3000](http://localhost:3000)
3. Click "Sign in" button (top-right)
4. Sign in with Google
5. Check console logs for auth state changes

## Role Detection

Roles are assigned automatically based on email domain:

```typescript
// In supabase-schema.sql trigger
CASE 
  WHEN email LIKE '%@school.ru' THEN 'teacher'
  WHEN email LIKE '%@edu.ru' THEN 'teacher'
  WHEN email LIKE '%@teacher.ru' THEN 'teacher'
  ELSE 'student'
END
```

### Customizing Role Detection

Edit the `handle_new_user()` function in `supabase-schema.sql`:

```sql
-- Add your custom domains
WHEN email LIKE '%@your-school-domain.com' THEN 'teacher'
WHEN email LIKE '%@organization.edu' THEN 'teacher'
```

## Mock Mode

If Supabase credentials are missing, the app automatically falls back to mock mode:
- AuthButton shows "(MVP)" badge
- Sign in simulates OAuth flow
- User data stored in localStorage
- No actual authentication occurs

This allows development without Supabase configuration.

## Testing Different Roles

### Test as Teacher
Use an email with one of these domains:
- `@school.ru`
- `@edu.ru`
- `@teacher.ru`

### Test as Student
Use any other email domain (e.g., Gmail, Outlook)

## Security Considerations

### Current (MVP)
- ✅ RLS policies protect profile data
- ✅ Users can only view their own profile
- ✅ Teachers can view all profiles (for admin purposes)
- ⚠️ Teacher Dashboard is publicly accessible (for testing)

### Before Production
- 🔒 Implement middleware route protection
- 🔒 Add RLS policies for teacher-only data
- 🔒 Restrict Teacher Dashboard access
- 🔒 Add email verification requirement
- 🔒 Implement session refresh tokens

## Troubleshooting

### "Supabase not configured" Error
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify values match Supabase Dashboard settings

### OAuth Redirect Failed
- Check authorized redirect URLs in Supabase Dashboard
- Ensure URLs match exactly (including http/https)

### Role Not Assigned Correctly
- Check email domain matches trigger logic
- Manually update profile in Supabase Dashboard:
  ```sql
  UPDATE profiles SET role = 'teacher' WHERE email = 'user@example.com';
  ```

### Session Not Persisting
- Check browser console for Supabase errors
- Verify cookies are enabled
- Try clearing localStorage and re-signing in

## Future Enhancements

- [ ] Email/Password authentication (in addition to Google)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Multi-factor authentication
- [ ] Organization/team support
- [ ] Admin dashboard for user management
- [ ] Role change requests/approval workflow

## Support

For issues or questions:
1. Check Supabase Documentation: https://supabase.com/docs/guides/auth
2. Review error logs in Supabase Dashboard
3. Check browser console for client-side errors

---

**Last Updated**: Phase 5 (Auth MVP) - March 2026
