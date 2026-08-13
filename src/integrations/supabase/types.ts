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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          points?: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_analysis: {
        Row: {
          confidence: number
          created_at: string
          detected_issue: string
          environmental_impact: string
          estimated_energy_loss: string | null
          estimated_water_loss: string | null
          id: string
          report_id: string
          severity: string
          suggested_action: string
          summary: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          detected_issue: string
          environmental_impact?: string
          estimated_energy_loss?: string | null
          estimated_water_loss?: string | null
          id?: string
          report_id: string
          severity?: string
          suggested_action?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          detected_issue?: string
          environmental_impact?: string
          estimated_energy_loss?: string | null
          estimated_water_loss?: string | null
          id?: string
          report_id?: string
          severity?: string
          suggested_action?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          description: string
          emoji: string
          id: string
          name: string
          points_required: number
          sort_order: number
        }
        Insert: {
          code: string
          description?: string
          emoji?: string
          id?: string
          name: string
          points_required?: number
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string
          emoji?: string
          id?: string
          name?: string
          points_required?: number
          sort_order?: number
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          image_path: string | null
          name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          image_path?: string | null
          name?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          excerpt: string
          id: string
          reading_minutes: number
          title: string
        }
        Insert: {
          category: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          reading_minutes?: number
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          excerpt?: string
          id?: string
          reading_minutes?: number
          title?: string
        }
        Relationships: []
      }
      message_read_status: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      point_rules: {
        Row: {
          action: string
          label: string
          points: number
        }
        Insert: {
          action: string
          label?: string
          points: number
        }
        Update: {
          action?: string
          label?: string
          points?: number
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          action: string
          created_at: string
          dedupe_key: string | null
          id: string
          label: string
          metadata: Json
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          label?: string
          metadata?: Json
          points: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          label?: string
          metadata?: Json
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          best_streak: number
          college: string
          created_at: string
          full_name: string
          green_points: number
          id: string
          last_active_at: string
          reputation: number
          streak_days: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          best_streak?: number
          college?: string
          created_at?: string
          full_name?: string
          green_points?: number
          id: string
          last_active_at?: string
          reputation?: number
          streak_days?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          best_streak?: number
          college?: string
          created_at?: string
          full_name?: string
          green_points?: number
          id?: string
          last_active_at?: string
          reputation?: number
          streak_days?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          category: string
          co2_saved_kg: number
          created_at: string
          description: string
          energy_saved_kwh: number
          id: string
          image_path: string | null
          location: string
          reference: string
          severity: string
          status: string
          title: string
          updated_at: string
          user_id: string
          water_saved_litres: number
        }
        Insert: {
          category: string
          co2_saved_kg?: number
          created_at?: string
          description?: string
          energy_saved_kwh?: number
          id?: string
          image_path?: string | null
          location?: string
          reference?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          water_saved_litres?: number
        }
        Update: {
          category?: string
          co2_saved_kg?: number
          created_at?: string
          description?: string
          energy_saved_kwh?: number
          id?: string
          image_path?: string | null
          location?: string
          reference?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          water_saved_litres?: number
        }
        Relationships: []
      }
      sustainability_scores: {
        Row: {
          campus: string
          created_at: string
          id: string
          recorded_for: string
          score: number
        }
        Insert: {
          campus?: string
          created_at?: string
          id?: string
          recorded_for?: string
          score?: number
        }
        Update: {
          campus?: string
          created_at?: string
          id?: string
          recorded_for?: string
          score?: number
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_code: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_code: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_code?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_code_fkey"
            columns: ["badge_code"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["code"]
          },
        ]
      }
      user_levels: {
        Row: {
          level: number
          min_points: number
          title: string
        }
        Insert: {
          level: number
          min_points: number
          title: string
        }
        Update: {
          level?: number
          min_points?: number
          title?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_friend_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      award_points: {
        Args: { _action: string; _dedupe_key?: string; _metadata?: Json }
        Returns: {
          awarded: number
          total: number
        }[]
      }
      get_leaderboard: {
        Args: { _college?: string; _limit?: number; _since?: string }
        Returns: {
          avatar_url: string
          badge_count: number
          college: string
          full_name: string
          green_points: number
          level: number
          period_points: number
          rank: number
          reports_count: number
          reputation: number
          user_id: string
          username: string
        }[]
      }
      get_public_profile: { Args: { _user_id: string }; Returns: Json }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      level_for_points: { Args: { _points: number }; Returns: number }
      mutual_friends_count: { Args: { _other_id: string }; Returns: number }
      remove_friend: { Args: { _other_id: string }; Returns: undefined }
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
