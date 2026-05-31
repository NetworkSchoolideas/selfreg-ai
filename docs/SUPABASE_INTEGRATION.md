# Supabase Integration Guide

## 📋 Overview

This project uses a **hybrid storage approach**:
- **Primary**: Supabase (cloud database)
- **Fallback**: localStorage (offline/local mode)

This ensures data persistence while maintaining backward compatibility.

## 🚀 Setup

### 1. Environment Variables

The `.env.local` file has been created with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://iyqfewihqswjkkdipoaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qk00i8ckdb9Xt55oGkGtPA_QQAyAbdG

# Service Role Key (Server-side only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Feature flag
NEXT_PUBLIC_SUPABASE_ENABLED=true
```

**⚠️ IMPORTANT:** 
- Never commit `.env.local` to version control
- The service role key should only be used server-side (API routes, Server Actions)
- The anon key is safe for client-side use

### 2. Database Schema

Run the SQL script in Supabase Dashboard:

1. Go to your Supabase project: https://iyqfewihqswjkkdipoaj.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **RUN** to execute

This will create:
- `children` table - adolescent profiles
- `sessions` table - session metadata
- `session_records` table - 5-stage records
- Row Level Security (RLS) policies
- Indexes for performance

### 3. Files Created

```
selfreg-ai-webapp-skeleton/
├── .env.local                    # Environment variables
├── lib/supabase.ts              # Supabase clients configuration
├── types/supabase.ts            # TypeScript types for database
├── supabase-schema.sql          # Database schema SQL
└── docs/SUPABASE_INTEGRATION.md # This file
```

## 📚 API Reference

### Public Client (Client-Side)

```typescript
import { supabase } from '@/lib/supabase';

// Check availability
if (supabase) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('child_id', childId);
}
```

### Admin Client (Server-Side Only)

```typescript
import { supabaseAdmin } from '@/lib/supabase';

// ONLY in API routes or Server Actions
const { data, error } = await supabaseAdmin
  .from('children')
  .insert({ name: 'Ivanov Ivan', class: '9A' });
```

### Utility Functions

```typescript
import { 
  isSupabaseAvailable,
  isSupabaseAdminAvailable,
  getSupabaseClient,
  getSupabaseAdmin
} from '@/lib/supabase';

// Check if Supabase is enabled
if (isSupabaseAvailable()) {
  // Use Supabase
} else {
  // Fallback to localStorage
}
```

## 🔄 Hybrid Storage Strategy

The integration follows this pattern:

```typescript
async function saveChild(childData) {
  try {
    // Try Supabase first
    if (supabase) {
      const { data, error } = await supabase
        .from('children')
        .insert(childData);
      
      if (!error) return data;
    }
  } catch (error) {
    console.warn('[Supabase] Save failed, falling back to localStorage');
  }
  
  // Fallback to localStorage
  return ChildrenStorage.addChildLocal(childData);
}
```

## 🗄️ Database Schema

### children Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Adolescent name |
| class | TEXT | Class (e.g., "9A") |
| user_id | UUID | Optional auth link |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### sessions Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| child_id | UUID | FK to children |
| context | TEXT | Session context |
| final_note | TEXT | Completion summary |
| status | TEXT | 'in_progress' \| 'completed' |
| completed_at | TIMESTAMPTZ | Completion time |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

### session_records Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | UUID | FK to sessions |
| stage_id | INTEGER | 1-5 (5 stages) |
| stage_title | TEXT | Stage name |
| scenario | TEXT | A/B scenario |
| feedback | TEXT | AI feedback |
| created_at | TIMESTAMPTZ | Record time |

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only access their own data
- Anonymous access disabled by default
- Service role key bypasses RLS (server-side only)

### Environment Variables

| Variable | Client-Side | Server-Side | Purpose |
|----------|-------------|-------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | ✅ | API endpoint |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | ✅ | Client auth |
| SUPABASE_SERVICE_ROLE_KEY | ❌ | ✅ | Admin operations |

## 📝 Next Steps

### Phase 2: Update Storage Modules

1. Update `lib/children-storage.ts`
2. Update `hooks/useSessionHistory.ts`
3. Update `hooks/useSessionSubmit.ts`
4. Add Supabase sync to `AdolescentPrototype.tsx`

### Phase 3: Teacher Dashboard Integration

1. Update TeacherDashboard to fetch from Supabase
2. Add real-time updates with Supabase subscriptions
3. Implement data export

### Phase 4: Testing & Migration

1. Test hybrid storage fallback
2. Create data migration script
3. Add monitoring and logging

## 🆘 Troubleshooting

### Supabase Client Not Available

```
[Supabase] Client not available. Check environment variables.
```

**Solution:** Verify `.env.local` exists and contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### RLS Policy Errors

```
permission denied for table children
```

**Solution:** Ensure RLS policies are created by running `supabase-schema.sql`

### TypeScript Errors

```
Cannot find module '@/types/supabase'
```

**Solution:** Run typecheck: `npm run typecheck`

## 📞 Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review RLS policies
3. Verify environment variables
4. Check browser console for errors

---

**Status:** ✅ Phase 1 Complete (Setup & Configuration)
**Next:** Phase 2 - Update Storage Modules
