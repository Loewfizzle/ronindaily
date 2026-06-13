// Generated from schema: supabase/migrations/001_initial_schema.sql
// Mirrors the output of: npx supabase gen types typescript --project-id jrwcrrhgcewjgfrdxast --schema public
// Re-run after any schema migration to keep in sync.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          unit: 'imperial' | 'metric'
          sex: 'M' | 'F'
          age: number
          height_cm: number
          start_weight: number
          goal_weight: number
          target_weeks: number
          start_date: string
        }
        Insert: {
          id: string
          created_at?: string
          unit: 'imperial' | 'metric'
          sex: 'M' | 'F'
          age: number
          height_cm: number
          start_weight: number
          goal_weight: number
          target_weeks: number
          start_date: string
        }
        Update: {
          id?: string
          created_at?: string
          unit?: 'imperial' | 'metric'
          sex?: 'M' | 'F'
          age?: number
          height_cm?: number
          start_weight?: number
          goal_weight?: number
          target_weeks?: number
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey'
            columns: ['id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      checkins: {
        Row: {
          id: string
          created_at: string
          user_id: string
          week_number: number
          weight: number
          checked_in_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          week_number: number
          weight: number
          checked_in_at: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          week_number?: number
          weight?: number
          checked_in_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'checkins_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string
          logged_date: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          logged_date: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          logged_date?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience aliases matching the table Row shapes
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
