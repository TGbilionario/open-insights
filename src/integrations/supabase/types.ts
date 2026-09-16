export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" }
  public: {
    Tables: {
      ai_analysis_history: {
        Row: {
          id: string; user_key: string; user_id: string | null; question: string;
          scenario_analysis: string | null; projection: string | null; consequences: string | null;
          most_likely_scenario: string | null; change_factors: string | null;
          credits_reserved: number; credits_charged: number; credit_source: string;
          provider: string; model: string; input_tokens: number; output_tokens: number;
          total_tokens: number; status: string; error_message: string | null; created_at: string;
          verification_sources: Json; verification_checked_at: string | null; verification_status: string;
        }
        Insert: {
          id?: string; user_key: string; user_id?: string | null; question: string;
          scenario_analysis?: string | null; projection?: string | null; consequences?: string | null;
          most_likely_scenario?: string | null; change_factors?: string | null;
          credits_reserved?: number; credits_charged?: number; credit_source?: string;
          provider?: string; model?: string; input_tokens?: number; output_tokens?: number;
          total_tokens?: number; status?: string; error_message?: string | null; created_at?: string;
          verification_sources?: Json; verification_checked_at?: string | null; verification_status?: string;
        }
        Update: Partial<Database['public']['Tables']['ai_analysis_history']['Insert']>
        Relationships: []
      }
      ai_credit_ledger: {
        Row: { id: string; user_key: string | null; user_id: string | null; type: string; amount: number; analysis_id: string | null; metadata: Json; created_at: string }
        Insert: { id?: string; user_key?: string | null; user_id?: string | null; type: string; amount: number; analysis_id?: string | null; metadata?: Json; created_at?: string }
        Update: Partial<Database['public']['Tables']['ai_credit_ledger']['Insert']>
        Relationships: []
      }
      ai_credit_pool: {
        Row: { id: string; daily_credit_limit: number; credits_remaining: number; reset_at: string; updated_at: string }
        Insert: { id?: string; daily_credit_limit?: number; credits_remaining?: number; reset_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['ai_credit_pool']['Insert']>
        Relationships: []
      }
      user_ai_usage: {
        Row: { id: string; user_key: string; user_id: string | null; free_uses_used: number; total_analyses: number; last_reset_at: string; updated_at: string }
        Insert: { id?: string; user_key: string; user_id?: string | null; free_uses_used?: number; total_analyses?: number; last_reset_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['user_ai_usage']['Insert']>
        Relationships: []
      }
      user_ai_wallets: {
        Row: { id: string; user_key: string; user_id: string | null; balance: number; lifetime_purchased: number; lifetime_consumed: number; updated_at: string }
        Insert: { id?: string; user_key: string; user_id?: string | null; balance?: number; lifetime_purchased?: number; lifetime_consumed?: number; updated_at?: string }
        Update: Partial<Database['public']['Tables']['user_ai_wallets']['Insert']>
        Relationships: []
      }
      editorial_content: {
        Row: {
          id: string; source_id: string; source_name: string; source_url: string; published_at: string | null;
          collected_at: string; title: string; summary: string | null; raw_content: string | null; ai_analysis: Json | null;
          editorial_status: string; priority: string | null; relevance_score: number | null; impact_score: number | null;
          repercussion_score: number | null; electoral_importance_score: number | null; public_interest_score: number | null;
          visual_potential_score: number | null; recency_score: number | null; category: string | null; subcategory: string | null;
          characters: string[] | null; parties: string[] | null; institutions: string[] | null; subjects: string[] | null;
          keywords: string[] | null; main_fact: string | null; context: string | null; analysis: string | null;
          projection: string | null; charge_phrase: string | null; sources: Json | null; script: string | null;
          visual_direction: string | null; verified_at: string | null; created_at: string; updated_at: string;
        }
        Insert: {
          id?: string; source_id: string; source_name?: string; source_url: string; published_at?: string | null;
          collected_at?: string; title: string; summary?: string | null; raw_content?: string | null; ai_analysis?: Json | null;
          editorial_status?: string; priority?: string | null; relevance_score?: number | null; impact_score?: number | null;
          repercussion_score?: number | null; electoral_importance_score?: number | null; public_interest_score?: number | null;
          visual_potential_score?: number | null; recency_score?: number | null; category?: string | null; subcategory?: string | null;
          characters?: string[] | null; parties?: string[] | null; institutions?: string[] | null; subjects?: string[] | null;
          keywords?: string[] | null; main_fact?: string | null; context?: string | null; analysis?: string | null;
          projection?: string | null; charge_phrase?: string | null; sources?: Json | null; script?: string | null;
          visual_direction?: string | null; verified_at?: string | null; created_at?: string; updated_at?: string;
        }
        Update: Partial<Database['public']['Tables']['editorial_content']['Insert']>
        Relationships: []
      }
      editorial_assets: {
        Row: { id: string; editorial_content_id: string; asset_type: string; scene_number: number | null; prompt: string | null; asset_url: string | null; provider: string | null; status: string; metadata: Json | null; created_at: string; updated_at: string }
        Insert: { id?: string; editorial_content_id: string; asset_type: string; scene_number?: number | null; prompt?: string | null; asset_url?: string | null; provider?: string | null; status?: string; metadata?: Json | null; created_at?: string; updated_at?: string }
        Update: Partial<Database['public']['Tables']['editorial_assets']['Insert']>
        Relationships: []
      }
      editorial_charges: {
        Row: { id: string; charge_code: string; headline: string; facts: string; why_it_matters: string; characters: string; sources: string; charge_type: string; stage: string; concept: string; phrase: string; master_prompt: string; scenes: Json; checks: Json; metadata: Json; created_at: string; updated_at: string; source_content_id: string | null }
        Insert: { id?: string; charge_code: string; headline: string; facts?: string; why_it_matters?: string; characters?: string; sources?: string; charge_type?: string; stage?: string; concept?: string; phrase?: string; master_prompt?: string; scenes?: Json; checks?: Json; metadata?: Json; created_at?: string; updated_at?: string; source_content_id?: string | null }
        Update: Partial<Database['public']['Tables']['editorial_charges']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      ai_get_state: { Args: { p_user_key: string }; Returns: Json }
      ai_next_reset: { Args: Record<string, never>; Returns: string }
      ai_refund_reservation: { Args: { p_amount: number; p_analysis_id: string; p_restore_free_use: boolean; p_source: string; p_user_id: string; p_user_key: string }; Returns: Json }
      ai_reserve_credits: { Args: { p_amount: number; p_free_limit: number; p_user_id: string; p_user_key: string }; Returns: Json }
      ai_settle_credits: { Args: { p_analysis_id: string; p_charged: number; p_reserved: number; p_source: string; p_user_id: string; p_user_key: string }; Returns: Json }
      ai_sync_pool: { Args: Record<string, never>; Returns: { credits_remaining: number; daily_credit_limit: number; id: string; reset_at: string; updated_at: string }[] }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, 'public'>]
export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]
export type CompositeTypes<T extends keyof DefaultSchema['CompositeTypes']> = DefaultSchema['CompositeTypes'][T]
export const Constants = { public: { Enums: {} } } as const
