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
          cta_href: string | null
          cta_label: string | null
          description: string | null
          display_order: number
          eyebrow: string | null
          full_banner_image_url: string | null
          height_vh: number
          id: string
          is_active: boolean
          link_url: string | null
          position: string
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
          cta_href?: string | null
          cta_label?: string | null
          description?: string | null
          display_order?: number
          eyebrow?: string | null
          full_banner_image_url?: string | null
          height_vh?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          position?: string
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
          cta_href?: string | null
          cta_label?: string | null
          description?: string | null
          display_order?: number
          eyebrow?: string | null
          full_banner_image_url?: string | null
          height_vh?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          position?: string
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
          department_id: string | null
          display_order: number
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          display_order?: number
          id?: string
          name: string
          parent_id?: string | null
          slug?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          display_order?: number
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_conversions: {
        Row: {
          coupon_code: string
          created_at: string
          discount_amount: number
          discount_id: string
          id: string
          influencer_name: string | null
          influencer_user_id: string | null
          order_id: string
          order_total: number
        }
        Insert: {
          coupon_code: string
          created_at?: string
          discount_amount?: number
          discount_id: string
          id?: string
          influencer_name?: string | null
          influencer_user_id?: string | null
          order_id: string
          order_total: number
        }
        Update: {
          coupon_code?: string
          created_at?: string
          discount_amount?: number
          discount_id?: string
          id?: string
          influencer_name?: string | null
          influencer_user_id?: string | null
          order_id?: string
          order_total?: number
        }
        Relationships: []
      }
      data_subject_requests: {
        Row: {
          created_at: string
          id: string
          legal_deadline: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_deadline?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_deadline?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
          influencer_name: string | null
          influencer_user_id: string | null
          is_active: boolean
          is_influencer_coupon: boolean
          is_referral_reward: boolean
          max_uses: number | null
          reward_id: string | null
          schedule_type: string
          scope_category: string | null
          scope_subcategory: string | null
          scope_type: string
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
          influencer_name?: string | null
          influencer_user_id?: string | null
          is_active?: boolean
          is_influencer_coupon?: boolean
          is_referral_reward?: boolean
          max_uses?: number | null
          reward_id?: string | null
          schedule_type: string
          scope_category?: string | null
          scope_subcategory?: string | null
          scope_type?: string
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
          influencer_name?: string | null
          influencer_user_id?: string | null
          is_active?: boolean
          is_influencer_coupon?: boolean
          is_referral_reward?: boolean
          max_uses?: number | null
          reward_id?: string | null
          schedule_type?: string
          scope_category?: string | null
          scope_subcategory?: string | null
          scope_type?: string
          start_time?: string | null
          times_used?: number | null
          type?: string
          user_id?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_influencer_user_id_fkey"
            columns: ["influencer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          color: string | null
          color_hex: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          image_urls: string[]
          name: string
          price: number | null
          product_id: string
          size: string | null
          sku: string | null
          stock: number
        }
        Insert: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          name: string
          price?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          stock?: number
        }
        Update: {
          color?: string | null
          color_hex?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          image_urls?: string[]
          name?: string
          price?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
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
      legal_documents: {
        Row: {
          change_summary: string | null
          content: string
          created_at: string
          doc_type: string
          id: string
          is_current: boolean
          published_at: string
          published_by: string
          version: string
        }
        Insert: {
          change_summary?: string | null
          content: string
          created_at?: string
          doc_type: string
          id?: string
          is_current?: boolean
          published_at?: string
          published_by: string
          version: string
        }
        Update: {
          change_summary?: string | null
          content?: string
          created_at?: string
          doc_type?: string
          id?: string
          is_current?: boolean
          published_at?: string
          published_by?: string
          version?: string
        }
        Relationships: []
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
      mfa_code_usage: {
        Row: {
          code_hash: string
          id: string
          time_step: number
          used_at: string
          user_id: string
        }
        Insert: {
          code_hash: string
          id?: string
          time_step: number
          used_at?: string
          user_id: string
        }
        Update: {
          code_hash?: string
          id?: string
          time_step?: number
          used_at?: string
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
      order_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          order_id: string
          performed_by: string | null
          refusal_reason: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          order_id: string
          performed_by?: string | null
          refusal_reason?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          order_id?: string
          performed_by?: string | null
          refusal_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_city: string
          address_complement: string | null
          address_neighborhood: string
          address_number: string
          address_state: string | null
          address_street: string
          cancellation_reason: string | null
          cep: string | null
          change_amount: number | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
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
          address_complement?: string | null
          address_neighborhood: string
          address_number: string
          address_state?: string | null
          address_street: string
          cancellation_reason?: string | null
          cep?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
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
          address_complement?: string | null
          address_neighborhood?: string
          address_number?: string
          address_state?: string | null
          address_street?: string
          cancellation_reason?: string | null
          cep?: string | null
          change_amount?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
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
      payment_settings: {
        Row: {
          created_at: string
          id: string
          max_interest_free_installments: number
          max_total_installments: number
          monthly_interest_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_interest_free_installments?: number
          max_total_installments?: number
          monthly_interest_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_interest_free_installments?: number
          max_total_installments?: number
          monthly_interest_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          session_id?: string | null
          user_id?: string | null
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
          image_position: string
          images: string[]
          min_stock: number | null
          name: string
          price: number
          sku: string | null
          slug: string
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
          image_position?: string
          images?: string[]
          min_stock?: number | null
          name: string
          price: number
          sku?: string | null
          slug?: string
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
          image_position?: string
          images?: string[]
          min_stock?: number | null
          name?: string
          price?: number
          sku?: string | null
          slug?: string
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
      promo_banners: {
        Row: {
          button_label: string | null
          button_link: string
          coupon_code: string | null
          created_at: string
          description: string | null
          display_order: number
          eyebrow: string | null
          id: string
          image_url: string
          is_active: boolean
          is_clickable: boolean
          mobile_image_url: string | null
          overlay_opacity: number
          rotation_seconds: number
          scheduled_end: string | null
          scheduled_start: string | null
          show_button: boolean
          subtitle: string | null
          text_align: string
          title: string | null
          updated_at: string
        }
        Insert: {
          button_label?: string | null
          button_link?: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          eyebrow?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          is_clickable?: boolean
          mobile_image_url?: string | null
          overlay_opacity?: number
          rotation_seconds?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          show_button?: boolean
          subtitle?: string | null
          text_align?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          button_label?: string | null
          button_link?: string
          coupon_code?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          eyebrow?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          is_clickable?: boolean
          mobile_image_url?: string | null
          overlay_opacity?: number
          rotation_seconds?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          show_button?: boolean
          subtitle?: string | null
          text_align?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
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
          image_url: string | null
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
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
          complement: string | null
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
          complement?: string | null
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
          complement?: string | null
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
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
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
      stock_movements: {
        Row: {
          category_snapshot: string | null
          created_at: string
          discount_amount: number | null
          final_price: number | null
          flavor_id: string | null
          id: string
          ip_address: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          order_id: string | null
          original_price: number | null
          payment_method: string | null
          product_id: string | null
          product_name_snapshot: string
          product_sku_snapshot: string | null
          quantity: number
          reason: Database["public"]["Enums"]["stock_movement_reason"] | null
          request_id: string
          reversed_by_movement_id: string | null
          reverses_movement_id: string | null
          stock_after: number
          stock_before: number
          user_agent: string | null
          user_email_snapshot: string | null
          user_id: string | null
          user_role_snapshot: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          category_snapshot?: string | null
          created_at?: string
          discount_amount?: number | null
          final_price?: number | null
          flavor_id?: string | null
          id?: string
          ip_address?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          order_id?: string | null
          original_price?: number | null
          payment_method?: string | null
          product_id?: string | null
          product_name_snapshot: string
          product_sku_snapshot?: string | null
          quantity: number
          reason?: Database["public"]["Enums"]["stock_movement_reason"] | null
          request_id: string
          reversed_by_movement_id?: string | null
          reverses_movement_id?: string | null
          stock_after: number
          stock_before: number
          user_agent?: string | null
          user_email_snapshot?: string | null
          user_id?: string | null
          user_role_snapshot?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          category_snapshot?: string | null
          created_at?: string
          discount_amount?: number | null
          final_price?: number | null
          flavor_id?: string | null
          id?: string
          ip_address?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          order_id?: string | null
          original_price?: number | null
          payment_method?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          product_sku_snapshot?: string | null
          quantity?: number
          reason?: Database["public"]["Enums"]["stock_movement_reason"] | null
          request_id?: string
          reversed_by_movement_id?: string | null
          reverses_movement_id?: string | null
          stock_after?: number
          stock_before?: number
          user_agent?: string | null
          user_email_snapshot?: string | null
          user_id?: string | null
          user_role_snapshot?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "public_flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "public_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_reversed_by_movement_id_fkey"
            columns: ["reversed_by_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_reverses_movement_id_fkey"
            columns: ["reverses_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      user_consents: {
        Row: {
          anonymous_id: string | null
          consent_type: string
          consent_version: string
          granted: boolean
          granted_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          anonymous_id?: string | null
          consent_type: string
          consent_version?: string
          granted: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          anonymous_id?: string | null
          consent_type?: string
          consent_version?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      public_review_responses: {
        Row: {
          created_at: string | null
          id: string | null
          response_text: string | null
          review_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          response_text?: string | null
          review_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          response_text?: string | null
          review_id?: string | null
          updated_at?: string | null
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
      public_reviews: {
        Row: {
          anonymous_user: string | null
          comment: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          product_id: string | null
          rating: number | null
        }
        Insert: {
          anonymous_user?: never
          comment?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          rating?: number | null
        }
        Update: {
          anonymous_user?: never
          comment?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
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
      balcao_ajuste_estoque: {
        Args: {
          p_flavor_id: string
          p_new_stock: number
          p_notes: string
          p_product_id: string
          p_request_id: string
        }
        Returns: string
      }
      balcao_baixa_estoque:
        | {
            Args: {
              p_flavor_id: string
              p_movement_type: Database["public"]["Enums"]["stock_movement_type"]
              p_notes: string
              p_product_id: string
              p_quantity: number
              p_reason: Database["public"]["Enums"]["stock_movement_reason"]
              p_request_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_flavor_id: string
              p_manual_discount?: number
              p_movement_type: Database["public"]["Enums"]["stock_movement_type"]
              p_notes: string
              p_payment_method?: string
              p_product_id: string
              p_quantity: number
              p_reason: Database["public"]["Enums"]["stock_movement_reason"]
              p_request_id: string
            }
            Returns: string
          }
      balcao_check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_minutes: number }
        Returns: undefined
      }
      balcao_entrada_estoque: {
        Args: {
          p_flavor_id: string
          p_notes: string
          p_product_id: string
          p_quantity: number
          p_request_id: string
        }
        Returns: string
      }
      balcao_reverter_baixa: {
        Args: { p_movement_id: string; p_notes?: string; p_request_id: string }
        Returns: string
      }
      balcao_unit_price: {
        Args: { p_flavor_id: string; p_product_id: string }
        Returns: number
      }
      claim_totp_code: { Args: { p_code_hash: string }; Returns: Json }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: {
        Args: { retention_days?: number }
        Returns: undefined
      }
      client_check_rate_limit: {
        Args: {
          p_action: string
          p_block_minutes: number
          p_max_attempts: number
          p_window_minutes: number
        }
        Returns: Json
      }
      client_reset_rate_limit: {
        Args: { p_action: string }
        Returns: undefined
      }
      export_user_data: { Args: never; Returns: Json }
      generate_referral_code: { Args: never; Returns: string }
      generate_unique_coupon_code: { Args: never; Returns: string }
      get_active_general_discounts: {
        Args: never
        Returns: {
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          schedule_type: string
          scope_category: string
          scope_subcategory: string
          scope_type: string
          start_time: string
          type: string
          valid_until: string
          value: number
        }[]
      }
      get_active_referral_rewards: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          points_required: number
          updated_at: string
        }[]
      }
      get_product_availability: {
        Args: { stock_value: number }
        Returns: string
      }
      get_user_primary_role: {
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
      is_password_change_required: {
        Args: { user_profile_id: string }
        Returns: boolean
      }
      list_users_for_influencer_linking: {
        Args: { search_text?: string }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      log_security_event: {
        Args: { p_event_type: string; p_metadata?: Json; p_severity?: string }
        Returns: undefined
      }
      publish_legal_document: {
        Args: {
          p_change_summary?: string
          p_content: string
          p_doc_type: string
          p_version: string
        }
        Returns: string
      }
      request_account_deletion: { Args: { p_reason?: string }; Returns: string }
      rollback_legal_document: {
        Args: { p_new_version: string; p_version_id: string }
        Returns: string
      }
      slugify: { Args: { v: string }; Returns: string }
      update_user_tier: { Args: { p_user_id: string }; Returns: undefined }
      user_needs_legal_reaccept: {
        Args: never
        Returns: {
          current_version: string
          doc_type: string
        }[]
      }
      user_purchased_product: {
        Args: { _product_id: string; _user_id: string }
        Returns: boolean
      }
      validate_discount_code: {
        Args: { code_input: string }
        Returns: {
          code: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          is_influencer_coupon: boolean
          is_own_influencer_coupon: boolean
          is_own_referral_reward: boolean
          is_referral_reward: boolean
          max_uses: number
          schedule_type: string
          scope_category: string
          scope_subcategory: string
          scope_type: string
          start_time: string
          type: string
          valid_until: string
          value: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin" | "operador"
      stock_movement_reason:
        | "venda_loja"
        | "produto_danificado"
        | "troca"
        | "ajuste_estoque"
        | "outro"
        | "venda_site"
        | "reversao"
        | "entrada_fornecedor"
      stock_movement_type:
        | "baixa_manual"
        | "reversao"
        | "entrada"
        | "ajuste_manual"
        | "venda_online"
        | "venda_loja_fisica"
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
      app_role: ["admin", "moderator", "user", "super_admin", "operador"],
      stock_movement_reason: [
        "venda_loja",
        "produto_danificado",
        "troca",
        "ajuste_estoque",
        "outro",
        "venda_site",
        "reversao",
        "entrada_fornecedor",
      ],
      stock_movement_type: [
        "baixa_manual",
        "reversao",
        "entrada",
        "ajuste_manual",
        "venda_online",
        "venda_loja_fisica",
      ],
    },
  },
} as const
