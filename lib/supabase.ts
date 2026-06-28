/**
 * Supabase Client Configuration
 * 
 * This module provides two Supabase clients:
 * 1. `supabase` - Public client for client-side operations (uses anon key)
 * 2. `supabaseAdmin` - Admin client for server-side operations (uses service role key)
 * 
 * IMPORTANT SECURITY NOTES:
 * - The public client should be used in browser/Client Components
 * - The admin client should ONLY be used in Server Components, API routes, or Server Actions
 * - Never expose the service role key in client-side code
 * 
 * @module supabase
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// ============================================================================
// Environment Variables Validation
// ============================================================================

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === 'true';

if (!supabaseUrl) {
  console.warn('[Supabase] Supabase URL is not set');
}

if (!supabaseAnonKey) {
  console.warn('[Supabase] Supabase public key is not set');
}

// ============================================================================
// Public Client (Client-Side Safe)
// ============================================================================

/**
 * Public Supabase client for use in browser/Client Components.
 * Uses the anonymous (anon) key - safe to expose in client-side code.
 * 
 * @example
 * ```typescript
 * const { data, error } = await supabase
 *   .from('sessions')
 *   .select('*')
 *   .eq('child_id', childId);
 * ```
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public'
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'X-Client-Info': 'selfreg-ai-webapp'
        }
      }
    })
  : null;

// ============================================================================
// Admin Client (Server-Side Only)
// ============================================================================

/**
 * Admin Supabase client for use in Server Components, API routes, and Server Actions.
 * Uses the service role key - has bypass of Row Level Security (RLS).
 * 
 * ⚠️ WARNING: NEVER use this client in client-side code!
 * 
 * @example
 * ```typescript
 * // In API route or Server Action
 * const { data, error } = await supabaseAdmin
 *   .from('sessions')
 *   .select('*')
 *   .eq('child_id', childId);
 * ```
 */
export const supabaseAdmin = supabaseServiceRoleKey && supabaseUrl
  ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      db: {
        schema: 'public'
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'X-Client-Info': 'selfreg-ai-admin'
        }
      }
    })
  : null;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if Supabase is available and configured.
 * 
 * @returns true if Supabase client is initialized
 */
export function isSupabaseAvailable(): boolean {
  return supabaseEnabled && supabase !== null;
}

/**
 * Check if Supabase admin client is available (server-side only).
 * 
 * @returns true if admin client is initialized
 */
export function isSupabaseAdminAvailable(): boolean {
  return supabaseAdmin !== null;
}

/**
 * Get the Supabase client, with fallback to null if not available.
 * 
 * @returns Supabase client or null
 */
export function getSupabaseClient() {
  if (!supabase) {
    throw new Error('[Supabase] Client not available. Check environment variables.');
  }
  return supabase;
}

/**
 * Get the Supabase admin client (server-side only).
 * 
 * @returns Supabase admin client
 * @throws Error if admin client is not available
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('[Supabase] Admin client not available. Check server environment variables.');
  }
  return supabaseAdmin;
}
