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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bonus_claims: {
        Row: {
          claimed_at: string | null
          id: string
          offer_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          id?: string
          offer_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          id?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_claims_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_task_progress: {
        Row: {
          bonus_amount: number | null
          claimed_at: string | null
          completed_at: string | null
          current_progress: number
          id: string
          is_claimed: boolean | null
          is_completed: boolean | null
          offer_id: string | null
          started_at: string
          target_progress: number
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          bonus_amount?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          id?: string
          is_claimed?: boolean | null
          is_completed?: boolean | null
          offer_id?: string | null
          started_at?: string
          target_progress: number
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          bonus_amount?: number | null
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          id?: string
          is_claimed?: boolean | null
          is_completed?: boolean | null
          offer_id?: string | null
          started_at?: string
          target_progress?: number
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_task_progress_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonus_task_progress_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_claims: {
        Row: {
          amount: number
          claimed_at: string
          day_number: number
          id: string
          offer_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          claimed_at?: string
          day_number?: number
          id?: string
          offer_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          day_number?: number
          id?: string
          offer_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_claims_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_claims_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          crypto_network: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          transaction_hash: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          crypto_network?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          transaction_hash?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          crypto_network?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          transaction_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          category: string
          content: string
          created_at: string
          display_order: number
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          animation: string | null
          auto_apply: boolean | null
          background_image: string | null
          bonus_amount: number
          bonus_mode: string | null
          bonus_percentage: number
          color_scheme: string | null
          created_at: string
          daily_claim_days: number | null
          daily_max_amount: number | null
          daily_min_amount: number | null
          deposit_target: number | null
          description: string | null
          extra_credit_fixed: number | null
          extra_credit_percent: number | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_instant_credit: boolean | null
          lossback_percentage: number | null
          max_amount: number | null
          min_amount: number
          offer_type: string
          one_time_only: boolean
          referral_reward: number | null
          task_target_count: number | null
          task_type: string | null
          theme: string | null
          title: string
          updated_at: string
          valid_from: string
          valid_until: string | null
          vip_level: number | null
          wagering_multiplier: number
        }
        Insert: {
          animation?: string | null
          auto_apply?: boolean | null
          background_image?: string | null
          bonus_amount?: number
          bonus_mode?: string | null
          bonus_percentage?: number
          color_scheme?: string | null
          created_at?: string
          daily_claim_days?: number | null
          daily_max_amount?: number | null
          daily_min_amount?: number | null
          deposit_target?: number | null
          description?: string | null
          extra_credit_fixed?: number | null
          extra_credit_percent?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_instant_credit?: boolean | null
          lossback_percentage?: number | null
          max_amount?: number | null
          min_amount?: number
          offer_type: string
          one_time_only?: boolean
          referral_reward?: number | null
          task_target_count?: number | null
          task_type?: string | null
          theme?: string | null
          title: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          vip_level?: number | null
          wagering_multiplier?: number
        }
        Update: {
          animation?: string | null
          auto_apply?: boolean | null
          background_image?: string | null
          bonus_amount?: number
          bonus_mode?: string | null
          bonus_percentage?: number
          color_scheme?: string | null
          created_at?: string
          daily_claim_days?: number | null
          daily_max_amount?: number | null
          daily_min_amount?: number | null
          deposit_target?: number | null
          description?: string | null
          extra_credit_fixed?: number | null
          extra_credit_percent?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_instant_credit?: boolean | null
          lossback_percentage?: number | null
          max_amount?: number | null
          min_amount?: number
          offer_type?: string
          one_time_only?: boolean
          referral_reward?: number | null
          task_target_count?: number | null
          task_type?: string | null
          theme?: string | null
          title?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          vip_level?: number | null
          wagering_multiplier?: number
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_blocked: boolean | null
          phone: string | null
          trading_level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          trading_level?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean | null
          phone?: string | null
          trading_level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          reward_per_referral: number | null
          user_id: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_per_referral?: number | null
          user_id: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          reward_per_referral?: number | null
          user_id?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_amount: number | null
          bonus_credited: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          referee_id: string
          referral_code_id: string | null
          referrer_id: string
          status: string | null
        }
        Insert: {
          bonus_amount?: number | null
          bonus_credited?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id: string
          referral_code_id?: string | null
          referrer_id: string
          status?: string | null
        }
        Update: {
          bonus_amount?: number | null
          bonus_credited?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referee_id?: string
          referral_code_id?: string | null
          referrer_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      social_channels: {
        Row: {
          channel_name: string
          channel_type: string
          channel_url: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          updated_at: string
        }
        Insert: {
          channel_name: string
          channel_type: string
          channel_url: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Update: {
          channel_name?: string
          channel_type?: string
          channel_url?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          admin_override: boolean | null
          amount: number
          closed_at: string | null
          created_at: string
          display_id: number
          duration_seconds: number | null
          end_time: string | null
          entry_price: number
          exit_price: number | null
          expected_result: string | null
          id: string
          processing_status: string | null
          profit_loss: number | null
          profit_percentage: number | null
          settlement_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["trade_status"]
          timer_started_at: string | null
          trade_type: Database["public"]["Enums"]["trade_type"]
          trading_pair: string
          user_id: string
        }
        Insert: {
          admin_override?: boolean | null
          amount: number
          closed_at?: string | null
          created_at?: string
          display_id?: number
          duration_seconds?: number | null
          end_time?: string | null
          entry_price: number
          exit_price?: number | null
          expected_result?: string | null
          id?: string
          processing_status?: string | null
          profit_loss?: number | null
          profit_percentage?: number | null
          settlement_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          timer_started_at?: string | null
          trade_type: Database["public"]["Enums"]["trade_type"]
          trading_pair: string
          user_id: string
        }
        Update: {
          admin_override?: boolean | null
          amount?: number
          closed_at?: string | null
          created_at?: string
          display_id?: number
          duration_seconds?: number | null
          end_time?: string | null
          entry_price?: number
          exit_price?: number | null
          expected_result?: string | null
          id?: string
          processing_status?: string | null
          profit_loss?: number | null
          profit_percentage?: number | null
          settlement_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["trade_status"]
          timer_started_at?: string | null
          trade_type?: Database["public"]["Enums"]["trade_type"]
          trading_pair?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          description: string | null
          display_id: number
          id: string
          reference_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          description?: string | null
          display_id?: number
          id?: string
          reference_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          description?: string | null
          display_id?: number
          id?: string
          reference_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_bonuses: {
        Row: {
          animation_shown: boolean | null
          bonus_amount: number
          bonus_credited: boolean | null
          bonus_type: string | null
          claimed_at: string
          completed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          locked_amount: number | null
          offer_id: string | null
          source_deposit_id: string | null
          source_trade_id: string | null
          status: string
          transaction_id: string | null
          unlocked_amount: number | null
          user_id: string
          wagering_completed: number
          wagering_required: number
        }
        Insert: {
          animation_shown?: boolean | null
          bonus_amount?: number
          bonus_credited?: boolean | null
          bonus_type?: string | null
          claimed_at?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_amount?: number | null
          offer_id?: string | null
          source_deposit_id?: string | null
          source_trade_id?: string | null
          status?: string
          transaction_id?: string | null
          unlocked_amount?: number | null
          user_id: string
          wagering_completed?: number
          wagering_required?: number
        }
        Update: {
          animation_shown?: boolean | null
          bonus_amount?: number
          bonus_credited?: boolean | null
          bonus_type?: string | null
          claimed_at?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          locked_amount?: number | null
          offer_id?: string | null
          source_deposit_id?: string | null
          source_trade_id?: string | null
          status?: string
          transaction_id?: string | null
          unlocked_amount?: number | null
          user_id?: string
          wagering_completed?: number
          wagering_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_bonuses_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          locked_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          upi_id: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          upi_id: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_bonus_direct: {
        Args: {
          p_bonus_amount: number
          p_bonus_type?: string
          p_offer_id: string
          p_user_id: string
        }
        Returns: Json
      }
      claim_daily_bonus: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: Json
      }
      claim_task_bonus: {
        Args: { p_offer_id: string; p_user_id: string }
        Returns: Json
      }
      confirm_deposit_with_bonus: {
        Args: {
          p_admin_id: string
          p_bonus_amount?: number
          p_deposit_id: string
          p_offer_id?: string
          p_wagering_multiplier?: number
        }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      settle_trade: {
        Args: {
          p_exit_price: number
          p_profit_loss: number
          p_settlement_id: string
          p_trade_id: string
          p_user_id: string
          p_won: boolean
        }
        Returns: Json
      }
      unlock_bonus: {
        Args: { p_user_bonus_id: string; p_user_id: string }
        Returns: Json
      }
      update_task_bonus_progress: {
        Args: { p_task_type?: string; p_user_id: string }
        Returns: undefined
      }
      update_wagering_progress: {
        Args: { p_trade_amount: number; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status: "pending" | "approved" | "rejected" | "paid"
      trade_status: "pending" | "won" | "lost" | "cancelled"
      trade_type: "buy" | "sell"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "trade_win"
        | "trade_loss"
        | "bonus"
        | "adjustment"
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
    Enums: {
      app_role: ["admin", "user"],
      request_status: ["pending", "approved", "rejected", "paid"],
      trade_status: ["pending", "won", "lost", "cancelled"],
      trade_type: ["buy", "sell"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "trade_win",
        "trade_loss",
        "bonus",
        "adjustment",
      ],
    },
  },
} as const
