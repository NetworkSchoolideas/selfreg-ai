/**
 * Supabase Database Types
 * 
 * Auto-generated types for Supabase schema.
 * This file should be updated when database schema changes.
 * 
 * Generated based on proposed schema for SelfReg AI project.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      children: {
        Row: {
          id: string
          name: string
          class: string
          created_at: string
          updated_at: string
          user_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          name: string
          class: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          name?: string
          class?: string
          created_at?: string
          updated_at?: string
          user_id?: string | null
          metadata?: Json | null
        }
      }
      sessions: {
        Row: {
          id: string
          child_id: string
          context: string
          final_note: string | null
          status: 'in_progress' | 'completed'
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          context: string
          final_note?: string | null
          status?: 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          context?: string
          final_note?: string | null
          status?: 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      session_records: {
        Row: {
          id: string
          session_id: string
          stage_id: number
          stage_title: string
          scenario: string
          feedback: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          stage_id: number
          stage_title: string
          scenario: string
          feedback: string
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          stage_id?: number
          stage_title?: string
          scenario?: string
          feedback?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
