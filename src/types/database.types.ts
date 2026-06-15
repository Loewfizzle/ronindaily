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
          activities: string[] | null
          meal_prefs: Json | null
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
          activities?: string[] | null
          meal_prefs?: Json | null
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
          activities?: string[] | null
          meal_prefs?: Json | null
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
      badges: {
        Row: {
          id: string
          created_at: string
          user_id: string
          badge_id: string
          earned_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          badge_id: string
          earned_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          badge_id?: string
          earned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'badges_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          created_at: string
          user_id: string
          logged_date: string
          activity_id: string
          planned_amount: number
          actual_amount: number
          unit: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          logged_date: string
          activity_id: string
          planned_amount: number
          actual_amount: number
          unit: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          logged_date?: string
          activity_id?: string
          planned_amount?: number
          actual_amount?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      activity_totals: {
        Row: {
          id: string
          created_at: string
          user_id: string
          activity_id: string
          total_amount: number
          unit: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          activity_id: string
          total_amount: number
          unit: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          activity_id?: string
          total_amount?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_totals_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      cheat_meals: {
        Row: {
          id: string
          created_at: string
          user_id: string
          logged_date: string
          description: string | null
          calories: number
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          logged_date: string
          description?: string | null
          calories: number
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          logged_date?: string
          description?: string | null
          calories?: number
        }
        Relationships: [
          {
            foreignKeyName: 'cheat_meals_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_accountability: {
        Row: {
          id: string
          created_at: string
          user_id: string
          logged_date: string
          result: 'complete' | 'partial' | 'failed'
          calories_hit: boolean
          movement_hit: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          logged_date: string
          result: 'complete' | 'partial' | 'failed'
          calories_hit: boolean
          movement_hit: boolean
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          logged_date?: string
          result?: 'complete' | 'partial' | 'failed'
          calories_hit?: boolean
          movement_hit?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'daily_accountability_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      meal_plans: {
        Row: {
          id: string
          user_id: string
          plan: Json
          generated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan: Json
          generated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan?: Json
          generated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'meal_plans_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          notification_time: string
          timezone: string
          is_active: boolean
          created_at: string
          milestone_notifications_sent: string[]
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          notification_time?: string
          timezone?: string
          is_active?: boolean
          created_at?: string
          milestone_notifications_sent?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          notification_time?: string
          timezone?: string
          is_active?: boolean
          created_at?: string
          milestone_notifications_sent?: string[]
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
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
