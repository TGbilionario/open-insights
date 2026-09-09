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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_analysis_history: {
        Row: {
          change_factors: string | null
          consequences: string | null
          created_at: string
          credit_source: string
          credits_charged: number
          credits_reserved: number
          error_message: string | null
          id: string
          input_tokens: number
          model: string
          most_likely_scenario: string | null
          output_tokens: number
          projection: string | null
          provider: string
          question: string
          scenario_analysis: string | null
          status: string
          total_tokens: number
          verification_sources: Json
          verification_checked_at: string | null
          verification_status: string
          user_id: string | null
          user_key: string
        }
        Insert: {
          change_factors?: string | null
          consequences?: string | null
          created_at?: string
          credit_source?: string
          credits_charged?: number
          credits_reserved?: number
          error_message?: string | null
          id?: string
          input_tokens?: number
          model?: string
          most_likely_scenario?: string | null
          output_tokens?: number
          projection?: string | null
          provider?: string
          question: string
          scenario_analysis?: string | null
          status?: string
          total_tokens?: number
          verification_sources?: Json
          verification_checked_at?: string | null
          verification_status?: string
          user_id?: string | null
          user_key: string
        }
        Update: {
          change_factors?: string | null
          consequences?: string | null
          created_at?: string
          credit_source?: string
          credits_charged?: number
          credits_reserved?: number
          error_message?: string | null
          id?: string
          input_tokens?: number
          model?: string
          most_likely_scenario?: string | null
          output_tokens?: number
          projection?: string | null
          provider?: string
          question?: string
          scenario_analysis?: string | null
          status?: string
          total_tokens?: number
          verification_sources?: Json
          verification_checked_at?: string | null
          verification_status?: string
          user_id?: string | null
          user_key?: string
        }
        Relationships: []
      }
      ai_credit_ledger: {
        Row: {
          amount: number
          analysis_id: string | null
          created_at: string
          id: string
          metadata: Json
          type: string
          user_id: string | null
          user_key: string | null
        }
        Insert: {
          amount: number
          analysis_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type: string
          user_id?: string | null
          user_key?: string | null
        }
        Update: {
          amount?: number
          analysis_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          type?: string
          user_id?: string | null
          user_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_history"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_pool: {
        Row: {
          credits_remaining: number
          daily_credit_limit: number
          id: string
          reset_at: string
          updated_at: string
        }
        Insert: {
          credits_remaining?: number
          daily_credit_limit?: number
          id?: string
          reset_at?: string
          updated_at?: string
        }
        Update: {
          credits_remaining?: number
          daily_credit_limit?: number
          id?: string
          reset_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_ai_usage: {
        Row: {
          free_uses_used: number
          id: string
          last_reset_at: string
          total_analyses: number
          updated_at: string
          user_id: string | null
          user_key: string
        }
        Insert: {
          free_uses_used?: number
          id?: string
          last_reset_at?: string
          total_analyses?: number
          updated_at?: string
          user_id?: string | null
          user_key: string
        }
        Update: {
          free_uses_used?: number
          id?: string
          last_reset_at?: string
          total_analyses?: number
          updated_at?: string
          user_id?: string | null
          user_key?: string
        }
        Relationships: []
      }
      user_ai_wallets: {
        Row: {
          balance: number
          id: string
          lifetime_consumed: number
          lifetime_purchased: number
          updated_at: string
          user_id: string | null
          user_key: string
        }
        Insert: {
          balance?: number
          id?: string
          lifetime_consumed?: number
          lifetime_purchased?: number
          updated_at?: string
          user_id?: string | null
          user_key: string
        }
        Update: {
          balance?: number
          id?: string
          lifetime_consumed?: number
          lifetime_purchased?: number
          updated_at?: string
          user_id?: string | null
          user_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ai_get_state: { Args: { p_user_key: string }; Returns: Json }
      ai_next_reset: { Args: never; Returns: string }
      ai_refund_reservation: {
        Args: {
          p_amount: number
          p_analysis_id: string
          p_restore_free_use: boolean
          p_source: string
          p_user_id: string
          p_user_key: string
        }
        Returns: Json
      }
      ai_reserve_credits: {
        Args: {
          p_amount: number
          p_free_limit: number
          p_user_id: string
          p_user_key: string
        }
        Returns: Json
      }
      ai_settle_credits: {
        Args: {
          p_analysis_id: string
          p_charged: number
          p_reserved: number
          p_source: string
          p_user_id: string
          p_user_key: string
        }
        Returns: Json
      }
      ai_sync_pool: {
        Args: never
        Returns: {
          credits_remaining: number
          daily_credit_limit: number
          id: string
          reset_at: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_pool"
          isOneToOne: true
          isSetofReturn: false
        }
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
    Enums: {},
  },
} as const
