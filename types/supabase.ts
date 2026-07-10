export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "teacher" | "student";
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "teacher" | "student";
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "teacher" | "student";
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      children: {
        Row: {
          id: string;
          name: string;
          class: string;
          created_at: string;
          updated_at: string;
          user_id: string | null;
          teacher_id: string | null;
          consent_given: boolean | null;
          consent_timestamp: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          name: string;
          class: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          teacher_id?: string | null;
          consent_given?: boolean | null;
          consent_timestamp?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          name?: string;
          class?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string | null;
          teacher_id?: string | null;
          consent_given?: boolean | null;
          consent_timestamp?: string | null;
          metadata?: Json | null;
        };
      };
      sessions: {
        Row: {
          id: string;
          child_id: string;
          context: string;
          final_note: string | null;
          status: "draft" | "in_progress" | "completed" | "abandoned";
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          lang: string | null;
          history_insight: string | null;
          adolescent_feedback: Json | null;
          student_archived_at: string | null;
        };
        Insert: {
          id?: string;
          child_id: string;
          context: string;
          final_note?: string | null;
          status?: "draft" | "in_progress" | "completed" | "abandoned";
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          lang?: string | null;
          history_insight?: string | null;
          adolescent_feedback?: Json | null;
          student_archived_at?: string | null;
        };
        Update: {
          id?: string;
          child_id?: string;
          context?: string;
          final_note?: string | null;
          status?: "draft" | "in_progress" | "completed" | "abandoned";
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          lang?: string | null;
          history_insight?: string | null;
          adolescent_feedback?: Json | null;
          student_archived_at?: string | null;
        };
      };
      session_records: {
        Row: {
          id: string;
          session_id: string;
          stage_id: number;
          stage_title: string;
          scenario: string;
          event_type: "answer" | "clarify_request" | "back" | "skip" | null;
          provider: string | null;
          model: string | null;
          response_mode: "mock" | "llm-json" | "llm-text" | "llm-fallback" | null;
          feedback: string;
          question: string | null;
          answer: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          stage_id: number;
          stage_title: string;
          scenario: string;
          event_type?: "answer" | "clarify_request" | "back" | "skip" | null;
          provider?: string | null;
          model?: string | null;
          response_mode?: "mock" | "llm-json" | "llm-text" | "llm-fallback" | null;
          feedback: string;
          question?: string | null;
          answer?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          stage_id?: number;
          stage_title?: string;
          scenario?: string;
          event_type?: "answer" | "clarify_request" | "back" | "skip" | null;
          provider?: string | null;
          model?: string | null;
          response_mode?: "mock" | "llm-json" | "llm-text" | "llm-fallback" | null;
          feedback?: string;
          question?: string | null;
          answer?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
