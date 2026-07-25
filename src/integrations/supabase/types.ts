export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          description: string | null
          earned_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          description?: string | null
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          productivity_percent: number
          tasks: Json
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          productivity_percent: number
          tasks: Json
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          productivity_percent?: number
          tasks?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      default_template: {
        Row: {
          created_at: string
          id: string
          tasks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tasks: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      draft_tasks: {
        Row: {
          created_at: string
          date: string
          id: string
          tasks: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          tasks: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          tasks?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draft_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          completed_at: string | null
          duration_minutes: number
          focus_type: string | null
          id: string
          is_completed: boolean
          started_at: string
          task_title: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          duration_minutes: number
          focus_type?: string | null
          id?: string
          is_completed?: boolean
          started_at?: string
          task_title?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          duration_minutes?: number
          focus_type?: string | null
          id?: string
          is_completed?: boolean
          started_at?: string
          task_title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_streaks: {
        Row: {
          created_at: string
          current_streak: number
          habit_name: string
          id: string
          last_completed_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          habit_name: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          habit_name?: string
          id?: string
          last_completed_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_tracking: {
        Row: {
          activity_level: string
          age: number
          ai_feedback: string | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          bmi: number | null
          bmr: number | null
          body_fat_percent: number | null
          calories_burned: number | null
          calories_consumed: number | null
          created_at: string
          date: string
          energy_level: number | null
          exercise_minutes: number | null
          exercise_type: string | null
          gender: string
          heart_rate: number | null
          height_cm: number
          id: string
          mood: string | null
          mood_notes: string | null
          notes: string | null
          sleep_hours: number | null
          sleep_quality: string | null
          steps: number | null
          stress_level: number | null
          updated_at: string
          user_id: string
          waist_cm: number | null
          water_glasses: number | null
          weight_kg: number
        }
        Insert: {
          activity_level?: string
          age: number
          ai_feedback?: string | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          bmr?: number | null
          body_fat_percent?: number | null
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string
          date?: string
          energy_level?: number | null
          exercise_minutes?: number | null
          exercise_type?: string | null
          gender: string
          heart_rate?: number | null
          height_cm: number
          id?: string
          mood?: string | null
          mood_notes?: string | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          steps?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id: string
          waist_cm?: number | null
          water_glasses?: number | null
          weight_kg: number
        }
        Update: {
          activity_level?: string
          age?: number
          ai_feedback?: string | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          bmr?: number | null
          body_fat_percent?: number | null
          calories_burned?: number | null
          calories_consumed?: number | null
          created_at?: string
          date?: string
          energy_level?: number | null
          exercise_minutes?: number | null
          exercise_type?: string | null
          gender?: string
          heart_rate?: number | null
          height_cm?: number
          id?: string
          mood?: string | null
          mood_notes?: string | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: string | null
          steps?: number | null
          stress_level?: number | null
          updated_at?: string
          user_id?: string
          waist_cm?: number | null
          water_glasses?: number | null
          weight_kg?: number
        }
        Relationships: []
      }
      missions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          progress_percent: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          progress_percent?: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          progress_percent?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      productivity_goals: {
        Row: {
          created_at: string
          end_date: string
          goal_type: string
          id: string
          start_date: string
          target_percentage: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          goal_type: string
          id?: string
          start_date: string
          target_percentage: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          goal_type?: string
          id?: string
          start_date?: string
          target_percentage?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id: string
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string
          window_start?: string | null
        }
        Relationships: []
      }
      routine_days: {
        Row: {
          created_at: string
          date: string
          id: string
          segments: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          segments?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          segments?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_templates: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          segments: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          segments?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          segments?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          tasks: Json
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          tasks: Json
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          tasks?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          evening_reminder_time: string | null
          id: string
          max_major_tasks: number
          morning_reminder_time: string | null
          notifications_enabled: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          evening_reminder_time?: string | null
          id?: string
          max_major_tasks?: number
          morning_reminder_time?: string | null
          notifications_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          evening_reminder_time?: string | null
          id?: string
          max_major_tasks?: number
          morning_reminder_time?: string | null
          notifications_enabled?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_max_requests?: number
          p_user_id: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
