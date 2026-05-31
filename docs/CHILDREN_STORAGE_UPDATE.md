# ChildrenStorage Module - Supabase Integration

## 📋 Overview

The `lib/children-storage.ts` module has been upgraded to use **Supabase as primary storage** with automatic **fallback to localStorage**.

## 🔄 Hybrid Storage Strategy

### How It Works

1. **Read Operations**:
   - First attempts to load from Supabase
   - On error → fallback to localStorage
   - Disables Supabase for future reads (one-time fallback)

2. **Write Operations**:
   - Always writes to localStorage (synchronous, immediate)
   - Attempts async write to Supabase (non-blocking)
   - On Supabase error → continues with localStorage only

### Benefits

- ✅ **Zero downtime**: App works even if Supabase is down
- ✅ **Offline support**: localStorage works without network
- ✅ **Data persistence**: Supabase provides cloud backup
- ✅ **Backward compatible**: Existing localStorage data still works
- ✅ **Non-blocking**: Supabase writes don't slow down the UI

## 📚 API Reference

### Read Methods

```typescript
// Get all children
const children = ChildrenStorage.getAll();

// Get single child by ID
const child = ChildrenStorage.getChild(childId);

// Get sessions for a child
const sessions = ChildrenStorage.getSessionsForChild(childId);

// Get latest session
const latest = ChildrenStorage.getLatestSessionForChild(childId);

// Get completed sessions only
const completed = ChildrenStorage.getCompletedSessionsForChild(childId);
```

### Write Methods

```typescript
// Add new child (minimal data)
const child = ChildrenStorage.addChild("Ivanov Ivan");

// Add child with real data (for registration)
const child = ChildrenStorage.addChildWithRealData(
  "id_12345",
  "Ivanov Ivan",
  "9A"
);

// Save session
ChildrenStorage.saveSessionForChild(childId, session);

// Delete session
const success = ChildrenStorage.deleteSession(childId, sessionUpdatedAt);

// Delete child and all sessions
const success = ChildrenStorage.deleteChild(childId);

// Attach AI insight to latest session
ChildrenStorage.attachHistoryInsight(childId, "AI comment here");

// Save adolescent feedback
ChildrenStorage.saveAdolescentFeedback(childId, feedback);
```

## 🔧 Configuration

### Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://iyqfewihqswjkkdipoaj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_qk00i8ckdb9Xt55oGkGtPA_QQAyAbdG
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_ENABLED=true
```

### Runtime Configuration

Supabase can be disabled at runtime:
```typescript
// Disable Supabase (fallback to localStorage only)
localStorage.setItem("supabase_enabled", "false");

// Re-enable Supabase
localStorage.removeItem("supabase_enabled");
```

## 🗄️ Database Schema

### children Table

```sql
id            UUID (PK)
name          TEXT (display name)
class         TEXT (e.g., "9A")
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
realData      JSONB (fio, klass)
```

### sessions Table

```sql
id            UUID (PK)
child_id      UUID (FK → children)
context       TEXT
final_note    TEXT
status        TEXT ('in_progress' | 'completed')
created_at    TIMESTAMPTZ
updated_at    TIMESTAMPTZ
completed_at  TIMESTAMPTZ
```

### session_records Table

```sql
id            UUID (PK)
session_id    UUID (FK → sessions)
stage_id      INTEGER (1-5)
stage_title   TEXT
scenario      TEXT
feedback      TEXT
created_at    TIMESTAMPTZ
```

## 🛡️ Error Handling

### Automatic Fallback

```typescript
try {
  const { data, error } = await supabase
    .from("children")
    .select("*");
  
  if (error) {
    // Automatically falls back to localStorage
    fallbackToLocal();
  }
} catch (err) {
  // Network errors, timeout, etc.
  fallbackToLocal();
}
```

### Logging

All operations are logged in development mode:
```
[ChildrenStorage] Loaded 3 children from Supabase
[ChildrenStorage] Added child to Supabase: child_123456
[ChildrenStorage] Fallback to localStorage enabled
```

## 🚨 Important Notes

### Async Writes

Write operations to Supabase are **asynchronous and non-blocking**:

```typescript
// This returns immediately
ChildrenStorage.saveSessionForChild(childId, session);

// Supabase write happens in background
// localStorage is updated immediately
```

### One-Time Fallback

Once Supabase fails, it's disabled for the session:
```typescript
// First read fails → fallback enabled
ChildrenStorage.getAll(); // Uses Supabase, fails

// Subsequent reads use localStorage
ChildrenStorage.getAll(); // Uses localStorage
```

This prevents repeated failed network requests.

### Data Consistency

- **localStorage**: Always up-to-date (synchronous)
- **Supabase**: Eventually consistent (async writes)
- **Priority**: localStorage is the source of truth during fallback

## 🧪 Testing

### Check Supabase Availability

```typescript
import { isSupabaseAvailable } from "@/lib/supabase";

if (isSupabaseAvailable()) {
  console.log("Supabase is enabled");
} else {
  console.log("Using localStorage only");
}
```

### View Logs

Open browser console to see storage operations:
```javascript
[ChildrenStorage] Loaded 5 children from Supabase
[ChildrenStorage] Saved session to Supabase
```

## 📊 Migration Path

### From Pure localStorage to Hybrid

1. **Existing users**: Continue using localStorage
2. **New users**: Data saved to both localStorage and Supabase
3. **Migration**: Manual script can sync localStorage → Supabase

### Future: Supabase-Only Mode

When ready, can enable strict Supabase mode:
```typescript
// TODO: Add strict mode option
const STRICT_SUPABASE_MODE = false; // When true, no localStorage fallback
```

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only access their own data
- Anonymous access disabled by default
- Service role key bypasses RLS (server-side only)

### API Key Safety

- **Anon key**: Safe for client-side use
- **Service role key**: NEVER exposed to client
- Environment variables properly scoped

## 🐛 Troubleshooting

### Supabase Not Available

```
[Supabase] Client not available. Check environment variables.
```

**Solution**: Verify `.env.local` has correct values

### Fallback Activated

```
[ChildrenStorage] Fallback to localStorage enabled
```

**Normal behavior**: Supabase temporarily unavailable, app continues working

### Data Not Syncing

Check browser console for:
```
[ChildrenStorage] Saved session to Supabase
```

If not present, Supabase writes are failing silently (expected during network issues).

## 📝 Next Steps

### Phase 3: Integration Updates

- [ ] Update `hooks/useSessionHistory.ts` to use new storage
- [ ] Update `hooks/useSessionSubmit.ts` to save to Supabase
- [ ] Add real-time updates with Supabase subscriptions
- [ ] Create data migration script

### Phase 4: Teacher Dashboard

- [ ] Update TeacherDashboard to fetch from Supabase
- [ ] Add multi-teacher access with RLS policies
- [ ] Implement data export functionality

---

**Status**: ✅ Phase 2 Complete (Storage Module Updated)
**Next**: Phase 3 - Hook Integration
