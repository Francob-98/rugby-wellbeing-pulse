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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      differentiated_reports: {
        Row: {
          comment: string | null
          created_at: string
          entry_date: string
          evolution: string
          id: string
          kinesio_note: string | null
          player_id: string
          player_line: string | null
          reason: string
          restriction: string
          source: string
          zones: Json
        }
        Insert: {
          comment?: string | null
          created_at?: string
          entry_date?: string
          evolution: string
          id?: string
          kinesio_note?: string | null
          player_id: string
          player_line?: string | null
          reason: string
          restriction?: string
          source: string
          zones?: Json
        }
        Update: {
          comment?: string | null
          created_at?: string
          entry_date?: string
          evolution?: string
          id?: string
          kinesio_note?: string | null
          player_id?: string
          player_line?: string | null
          reason?: string
          restriction?: string
          source?: string
          zones?: Json
        }
        Relationships: [
          {
            foreignKeyName: "differentiated_reports_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_distance_references: {
        Row: {
          distance_m: number
          player_line: string
          session_type: string
        }
        Insert: {
          distance_m: number
          player_line: string
          session_type: string
        }
        Update: {
          distance_m?: number
          player_line?: string
          session_type?: string
        }
        Relationships: []
      }
      gps_entries: {
        Row: {
          accel_decel: number | null
          accel_decel_per_min: number | null
          created_at: string
          distance_m: number | null
          duration_min: number | null
          gps_name: string
          hsd_m: number | null
          hsd_per_min: number | null
          id: string
          m_per_min: number | null
          max_accel: number | null
          max_decel: number | null
          max_speed: number | null
          player_id: string | null
          player_line: string | null
          position: string | null
          session_id: string
          sprint_per_min: number | null
        }
        Insert: {
          accel_decel?: number | null
          accel_decel_per_min?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          gps_name: string
          hsd_m?: number | null
          hsd_per_min?: number | null
          id?: string
          m_per_min?: number | null
          max_accel?: number | null
          max_decel?: number | null
          max_speed?: number | null
          player_id?: string | null
          player_line?: string | null
          position?: string | null
          session_id: string
          sprint_per_min?: number | null
        }
        Update: {
          accel_decel?: number | null
          accel_decel_per_min?: number | null
          created_at?: string
          distance_m?: number | null
          duration_min?: number | null
          gps_name?: string
          hsd_m?: number | null
          hsd_per_min?: number | null
          id?: string
          m_per_min?: number | null
          max_accel?: number | null
          max_decel?: number | null
          max_speed?: number | null
          player_id?: string | null
          player_line?: string | null
          position?: string | null
          session_id?: string
          sprint_per_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gps_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "gps_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_sessions: {
        Row: {
          backs_target_m: number | null
          created_at: string
          created_by: string | null
          description: string | null
          forwards_target_m: number | null
          id: string
          session_date: string
          session_type: string
          source_file: string | null
          team: string
        }
        Insert: {
          backs_target_m?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forwards_target_m?: number | null
          id?: string
          session_date?: string
          session_type?: string
          source_file?: string | null
          team?: string
        }
        Update: {
          backs_target_m?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          forwards_target_m?: number | null
          id?: string
          session_date?: string
          session_type?: string
          source_file?: string | null
          team?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          position: string | null
          team: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          position?: string | null
          team?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          position?: string | null
          team?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      session_entries: {
        Row: {
          comments: string | null
          created_at: string
          duration_min: number
          entry_date: string
          fatigue: number
          id: string
          load: number | null
          pain_zones: Json
          player_id: string
          player_line: string | null
          rpe: number
          session_type: string
          team: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          duration_min: number
          entry_date?: string
          fatigue: number
          id?: string
          load?: number | null
          pain_zones?: Json
          player_id: string
          player_line?: string | null
          rpe: number
          session_type?: string
          team: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          duration_min?: number
          entry_date?: string
          fatigue?: number
          id?: string
          load?: number | null
          pain_zones?: Json
          player_id?: string
          player_line?: string | null
          rpe?: number
          session_type?: string
          team?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wellness_entries: {
        Row: {
          created_at: string
          entry_date: string
          fatigue: number
          id: string
          mood: number
          pain_zones: Json
          player_id: string
          player_line: string | null
          sleep_hours: number
          sleep_quality: number
          soreness: number
          stress: number
        }
        Insert: {
          created_at?: string
          entry_date?: string
          fatigue: number
          id?: string
          mood: number
          pain_zones?: Json
          player_id: string
          player_line?: string | null
          sleep_hours: number
          sleep_quality: number
          soreness: number
          stress: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          fatigue?: number
          id?: string
          mood?: number
          pain_zones?: Json
          player_id?: string
          player_line?: string | null
          sleep_hours?: number
          sleep_quality?: number
          soreness?: number
          stress?: number
        }
        Relationships: [
          {
            foreignKeyName: "wellness_entries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
