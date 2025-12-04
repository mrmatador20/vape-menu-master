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
      account_recovery_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          background_color: string
          background_image_url: string | null
          created_at: string
          description: string | null
          display_order: number
          full_banner_image_url: string | null
          id: string
          is_active: boolean
          rotation_seconds: number
          scheduled_end: string | null
          scheduled_start: string | null
          text_color: string
          title: string
          transition_type: string
          updated_at: string
        }
        Insert: {
          background_color?: string
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_banner_image_url?: string | null
          id?: string
          is_active?: boolean
          rotation_seconds?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          text_color?: string
          title: string
          transition_type?: string
          updated_at?: string
        }
        Update: {
          background_color?: string
          background_image_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          full_banner_image_url?: string | null
          id?: string
          is_active?: boolean
          rotation_seconds?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          text_color?: string
          title?: string
          transition_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_usage: {
        Row: {
          discount_id: string
          id: string
          order_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          order_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          order_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_usage_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          code: string
          created_at: string
          day_of_week: number | null
          end_time: string | null
          id: string
          is_active: boolean
          is_referral_reward: boolean | null
          max_uses: number | null
          reward_id: string | null
          schedule_type: string
          start_time: string | null
          times_used: number | null
          type: string
          user_id: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          is_referral_reward?: boolean | null
          max_uses?: number | null
          reward_id?: string | null
          schedule_type: string
          start_time?: string | null
          times_used?: number | null
          type: string
          user_id?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          day_of_week?: number | null
          end_time?: string | null
          id?: string
          is_active?: boolean
          is_referral_reward?: boolean | null
          max_uses?: number | null
          reward_id?: string | null
          schedule_type?: string
          start_time?: string | null
          times_used?: number | null
          type?: string
          user_id?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          purpose: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          purpose?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flavors: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number | null
          product_id: string
          stock: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number | null
          product_id: string
          stock?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number | null
          product_id?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notify_account_locked: boolean | null
          notify_admin_actions: boolean | null
          notify_failed_auth: boolean | null
          notify_password_change: boolean | null
          notify_suspicious_login: boolean | null
          phone_number: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_account_locked?: boolean | null
          notify_admin_actions?: boolean | null
          notify_failed_auth?: boolean | null
          notify_password_change?: boolean | null
          notify_suspicious_login?: boolean | null
          phone_number?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_account_locked?: boolean | null
          notify_admin_actions?: boolean | null
          notify_failed_auth?: boolean | null
          notify_password_change?: boolean | null
          notify_suspicious_login?: boolean | null
          phone_number?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          flavor: string | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          created_at?: string | null
          flavor?: string | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
        }
        Update: {
          created_at?: string | null
          flavor?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_city: string
          address_neighborhood: string
          address_number: string
          address_street: string
          cancellation_reason: string | null
          cep: string | null
          change_amount: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_method: string
          referral_points_awarded: boolean | null
          referred_by_code: string | null
          shipping_cost: number | null
          status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          address_city: string
          address_neighborhood: string
          address_number: string
          address_street: string
          cancellation_reason?: string | null
          cep?: string | null
          change_amount?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_method: string
          referral_points_awarded?: boolean | null
          referred_by_code?: string | null
          shipping_cost?: number | null
          status?: string
          total_amount: number
          user_id: string
        }
        Update: {
          address_city?: string
          address_neighborhood?: string
          address_number?: string
          address_street?: string
          cancellation_reason?: string | null
          cep?: string | null
          change_amount?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string
          referral_points_awarded?: boolean | null
          referred_by_code?: string | null
          shipping_cost?: number | null
          status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          display_order: number | null
          id: string
          image: string | null
          min_stock: number | null
          name: string
          price: number
          stock: number
          subcategory: string | null
          visible_in_all: boolean
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_order?: number | null
          id?: string
          image?: string | null
          min_stock?: number | null
          name: string
          price: number
          stock?: number
          subcategory?: string | null
          visible_in_all?: boolean
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_order?: number | null
          id?: string
          image?: string | null
          min_stock?: number | null
          name?: string
          price?: number
          stock?: number
          subcategory?: string | null
          visible_in_all?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          birth_date: string | null
          cep: string | null
          created_at: string
          full_name: string | null
          id: string
          password_changed_at: string | null
          phone: string | null
          referral_code: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          password_changed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          cep?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          password_changed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_tracking: {
        Row: {
          action_type: string
          attempt_count: number
          block_expires_at: string | null
          created_at: string
          id: string
          identifier: string
          is_blocked: boolean
          updated_at: string
          window_start: string
        }
        Insert: {
          action_type: string
          attempt_count?: number
          block_expires_at?: string | null
          created_at?: string
          id?: string
          identifier: string
          is_blocked?: boolean
          updated_at?: string
          window_start?: string
        }
        Update: {
          action_type?: string
          attempt_count?: number
          block_expires_at?: string | null
          created_at?: string
          id?: string
          identifier?: string
          is_blocked?: boolean
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_points: {
        Row: {
          created_at: string
          current_tier_id: string | null
          id: string
          points_balance: number
          total_earned: number
          total_redeemed: number
          total_successful_referrals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier_id?: string | null
          id?: string
          points_balance?: number
          total_earned?: number
          total_redeemed?: number
          total_successful_referrals?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier_id?: string | null
          id?: string
          points_balance?: number
          total_earned?: number
          total_redeemed?: number
          total_successful_referrals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_points_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "referral_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          created_at: string
          description: string | null
          discount_code: string | null
          id: string
          is_active: boolean
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_discount_code_fkey"
            columns: ["discount_code"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["code"]
          },
        ]
      }
      referral_tiers: {
        Row: {
          badge_color: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          min_referrals: number
          name: string
          points_multiplier: number
          updated_at: string
        }
        Insert: {
          badge_color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          min_referrals: number
          name: string
          points_multiplier?: number
          updated_at?: string
        }
        Update: {
          badge_color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          min_referrals?: number
          name?: string
          points_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      referral_transactions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          points_amount: number
          related_order_id: string | null
          related_user_id: string | null
          reward_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          points_amount: number
          related_order_id?: string | null
          related_user_id?: string | null
          reward_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          points_amount?: number
          related_order_id?: string | null
          related_user_id?: string | null
          reward_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      review_responses: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          response_text: string
          review_id: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          response_text: string
          review_id: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          response_text?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "public_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_responses_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_addresses: {
        Row: {
          cep: string
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          neighborhood: string
          number: string
          state: string | null
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep: string
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          neighborhood: string
          number: string
          state?: string | null
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          neighborhood?: string
          number?: string
          state?: string | null
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message_content: string
          metadata: Json | null
          notification_type: string
          recipient: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content: string
          metadata?: Json | null
          notification_type: string
          recipient: string
          status: string
          subject?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message_content?: string
          metadata?: Json | null
          notification_type?: string
          recipient?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_questions: {
        Row: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at: string
          id: string
          question_1: string
          question_2: string
          question_3: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer_1_hash: string
          answer_2_hash: string
          answer_3_hash: string
          created_at?: string
          id?: string
          question_1: string
          question_2: string
          question_3: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer_1_hash?: string
          answer_2_hash?: string
          answer_3_hash?: string
          created_at?: string
          id?: string
          question_1?: string
          question_2?: string
          question_3?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          cep: string | null
          created_at: string
          free_shipping_min_value: number | null
          id: string
          price: number
          updated_at: string
        }
        Insert: {
          cep?: string | null
          created_at?: string
          free_shipping_min_value?: number | null
          id?: string
          price: number
          updated_at?: string
        }
        Update: {
          cep?: string | null
          created_at?: string
          free_shipping_min_value?: number | null
          id?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          ip_address: string | null
          is_trusted: boolean
          last_used_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_used_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          ip_address?: string | null
          is_trusted?: boolean
          last_used_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          activity_type: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          severity: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_flavors: {
        Row: {
          availability_status: string | null
          created_at: string | null
          id: string | null
          in_stock: boolean | null
          name: string | null
          price: number | null
          product_id: string | null
        }
        Insert: {
          availability_status?: never
          created_at?: string | null
          id?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          product_id?: string | null
        }
        Update: {
          availability_status?: never
          created_at?: string | null
          id?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flavors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
      public_products: {
        Row: {
          availability_status: string | null
          category: string | null
          created_at: string | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          display_order: number | null
          id: string | null
          image: string | null
          in_stock: boolean | null
          name: string | null
          price: number | null
          subcategory: string | null
        }
        Insert: {
          availability_status?: never
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_order?: number | null
          id?: string | null
          image?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          subcategory?: string | null
        }
        Update: {
          availability_status?: never
          category?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          display_order?: number | null
          id?: string | null
          image?: string | null
          in_stock?: never
          name?: string | null
          price?: number | null
          subcategory?: string | null
        }
        Relationships: []
      }
      public_reviews: {
        Row: {
          anonymous_user: string | null
          comment: string | null
          created_at: string | null
          id: string | null
          product_id: string | null
          rating: number | null
        }
        Insert: {
          anonymous_user?: never
          comment?: string | null
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
        }
        Update: {
          anonymous_user?: never
          comment?: string | null
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_unique_coupon_code: { Args: never; Returns: string }
      get_product_availability: {
        Args: { stock_value: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_password_change_required: {
        Args: { user_profile_id: string }
        Returns: boolean
      }
      update_user_tier: { Args: { p_user_id: string }; Returns: undefined }
      validate_discount_code: {
        Args: { code_input: string }
        Returns: {
          code: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          max_uses: number
          schedule_type: string
          start_time: string
          type: string
          valid_until: string
          value: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
