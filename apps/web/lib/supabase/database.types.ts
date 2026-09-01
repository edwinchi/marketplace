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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: boolean
          updated_at: string
        }
        Insert: {
          key: string
          value: boolean
          updated_at?: string
        }
        Update: {
          key?: string
          value?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      attribute_option_translations: {
        Row: {
          label: string
          language_code: string
          option_id: string
        }
        Insert: {
          label: string
          language_code: string
          option_id: string
        }
        Update: {
          label?: string
          language_code?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_option_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "attribute_option_translations_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_options: {
        Row: {
          attribute_id: string
          id: string
          is_active: boolean
          sort_order: number
          stable_key: string
        }
        Insert: {
          attribute_id: string
          id?: string
          is_active?: boolean
          sort_order?: number
          stable_key: string
        }
        Update: {
          attribute_id?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          stable_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_options_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_translations: {
        Row: {
          attribute_id: string
          help_text: string | null
          language_code: string
          name: string
          placeholder: string | null
        }
        Insert: {
          attribute_id: string
          help_text?: string | null
          language_code: string
          name: string
          placeholder?: string | null
        }
        Update: {
          attribute_id?: string
          help_text?: string | null
          language_code?: string
          name?: string
          placeholder?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribute_translations_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribute_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      attributes: {
        Row: {
          data_type: string
          id: string
          is_active: boolean
          is_filterable: boolean
          is_searchable: boolean
          stable_key: string
          unit_code: string | null
        }
        Insert: {
          data_type: string
          id?: string
          is_active?: boolean
          is_filterable?: boolean
          is_searchable?: boolean
          stable_key: string
          unit_code?: string | null
        }
        Update: {
          data_type?: string
          id?: string
          is_active?: boolean
          is_filterable?: boolean
          is_searchable?: boolean
          stable_key?: string
          unit_code?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs_2026_08: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: []
      }
      audit_logs_2026_09: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: []
      }
      audit_logs_default: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          new_values: Json | null
          previous_values: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          previous_values?: Json | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          chamber_of_commerce_number: string | null
          created_at: string
          id: string
          legal_name: string
          owner_profile_id: string
          trading_name: string | null
          vat_number: string | null
          verification_status: string
        }
        Insert: {
          chamber_of_commerce_number?: string | null
          created_at?: string
          id?: string
          legal_name: string
          owner_profile_id: string
          trading_name?: string | null
          vat_number?: string | null
          verification_status?: string
        }
        Update: {
          chamber_of_commerce_number?: string | null
          created_at?: string
          id?: string
          legal_name?: string
          owner_profile_id?: string
          trading_name?: string | null
          vat_number?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          allows_listings: boolean
          created_at: string
          external_reference: string | null
          id: string
          is_active: boolean
          level: number
          metadata: Json
          parent_id: string | null
          sort_order: number
          stable_key: string
        }
        Insert: {
          allows_listings?: boolean
          created_at?: string
          external_reference?: string | null
          id?: string
          is_active?: boolean
          level?: number
          metadata?: Json
          parent_id?: string | null
          sort_order?: number
          stable_key: string
        }
        Update: {
          allows_listings?: boolean
          created_at?: string
          external_reference?: string | null
          id?: string
          is_active?: boolean
          level?: number
          metadata?: Json
          parent_id?: string | null
          sort_order?: number
          stable_key?: string
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
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
          is_required: boolean
          is_search_filter: boolean
          sort_order: number
          validation_rules: Json
        }
        Insert: {
          attribute_id: string
          category_id: string
          is_required?: boolean
          is_search_filter?: boolean
          sort_order?: number
          validation_rules?: Json
        }
        Update: {
          attribute_id?: string
          category_id?: string
          is_required?: boolean
          is_search_filter?: boolean
          sort_order?: number
          validation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_translations: {
        Row: {
          category_id: string
          description: string | null
          language_code: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
        }
        Insert: {
          category_id: string
          description?: string | null
          language_code: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
        }
        Update: {
          category_id?: string
          description?: string | null
          language_code?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      category_gallery_images: {
        Row: {
          author: string | null
          category_id: string
          created_at: string
          id: string
          license: string | null
          sort_order: number
          source_url: string | null
          storage_key: string
        }
        Insert: {
          author?: string | null
          category_id: string
          created_at?: string
          id?: string
          license?: string | null
          sort_order?: number
          source_url?: string | null
          storage_key: string
        }
        Update: {
          author?: string | null
          category_id?: string
          created_at?: string
          id?: string
          license?: string | null
          sort_order?: number
          source_url?: string | null
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_gallery_images_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          profile_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          profile_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          postal_code: string | null
          profile_id: string
          recipient_name: string
          street: string
        }
        Insert: {
          city: string
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          postal_code?: string | null
          profile_id: string
          recipient_name: string
          street: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          postal_code?: string | null
          profile_id?: string
          recipient_name?: string
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_sellers: {
        Row: {
          created_at: string
          profile_id: string
          seller_profile_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          seller_profile_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          seller_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_sellers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_sellers_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          positive_tags: string[]
          rating: number
          reviewee_profile_id: string
          reviewer_profile_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          positive_tags?: string[]
          rating: number
          reviewee_profile_id: string
          reviewer_profile_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          positive_tags?: string[]
          rating?: number
          reviewee_profile_id?: string
          reviewer_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_profile_id_fkey"
            columns: ["reviewee_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_profile_id_fkey"
            columns: ["reviewer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed_listings: {
        Row: {
          listing_id: string
          profile_id: string
          viewed_at: string
        }
        Insert: {
          listing_id: string
          profile_id: string
          viewed_at?: string
        }
        Update: {
          listing_id?: string
          profile_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recently_viewed_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          code: string
          direction: string
          english_name: string
          is_active: boolean
          is_default: boolean
          native_name: string
        }
        Insert: {
          code: string
          direction?: string
          english_name: string
          is_active?: boolean
          is_default?: boolean
          native_name: string
        }
        Update: {
          code?: string
          direction?: string
          english_name?: string
          is_active?: boolean
          is_default?: boolean
          native_name?: string
        }
        Relationships: []
      }
      listing_ai_metadata: {
        Row: {
          automated_tags: string[]
          confidence_score: number | null
          detected_brand: string | null
          detected_condition: string | null
          listing_id: string
          model_name: string | null
          processed_at: string
          raw_vision_analysis: Json
          suggested_category_id: string | null
          suggested_currency_code: string | null
          suggested_price_max_minor: number | null
          suggested_price_min_minor: number | null
        }
        Insert: {
          automated_tags?: string[]
          confidence_score?: number | null
          detected_brand?: string | null
          detected_condition?: string | null
          listing_id: string
          model_name?: string | null
          processed_at?: string
          raw_vision_analysis?: Json
          suggested_category_id?: string | null
          suggested_currency_code?: string | null
          suggested_price_max_minor?: number | null
          suggested_price_min_minor?: number | null
        }
        Update: {
          automated_tags?: string[]
          confidence_score?: number | null
          detected_brand?: string | null
          detected_condition?: string | null
          listing_id?: string
          model_name?: string | null
          processed_at?: string
          raw_vision_analysis?: Json
          suggested_category_id?: string | null
          suggested_currency_code?: string | null
          suggested_price_max_minor?: number | null
          suggested_price_min_minor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_ai_metadata_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_ai_metadata_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_attribute_multi_options: {
        Row: {
          attribute_id: string
          listing_id: string
          option_id: string
        }
        Insert: {
          attribute_id: string
          listing_id: string
          option_id: string
        }
        Update: {
          attribute_id?: string
          listing_id?: string
          option_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_attribute_multi_options_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_attribute_multi_options_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_attribute_multi_options_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_attribute_values: {
        Row: {
          attribute_id: string
          listing_id: string
          value_boolean: boolean | null
          value_date: string | null
          value_datetime: string | null
          value_json: Json | null
          value_number: number | null
          value_option_id: string | null
          value_text: string | null
        }
        Insert: {
          attribute_id: string
          listing_id: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_datetime?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_option_id?: string | null
          value_text?: string | null
        }
        Update: {
          attribute_id?: string
          listing_id?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_datetime?: string | null
          value_json?: Json | null
          value_number?: number | null
          value_option_id?: string | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_attribute_values_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_attribute_values_value_option_id_fkey"
            columns: ["value_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_media: {
        Row: {
          alt_text: Json
          created_at: string
          file_size_bytes: number | null
          id: string
          listing_id: string
          media_type: string
          mime_type: string | null
          moderation_status: string
          sort_order: number
          storage_key: string
        }
        Insert: {
          alt_text?: Json
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          listing_id: string
          media_type?: string
          mime_type?: string | null
          moderation_status?: string
          sort_order?: number
          storage_key: string
        }
        Update: {
          alt_text?: Json
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          listing_id?: string
          media_type?: string
          mime_type?: string | null
          moderation_status?: string
          sort_order?: number
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_translations: {
        Row: {
          description: string
          language_code: string
          listing_id: string
          slug: string
          title: string
          translated_by: string | null
          translation_status: string
        }
        Insert: {
          description: string
          language_code: string
          listing_id: string
          slug: string
          title: string
          translated_by?: string | null
          translation_status?: string
        }
        Update: {
          description?: string
          language_code?: string
          listing_id?: string
          slug?: string
          title?: string
          translated_by?: string | null
          translation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_translations_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "listing_translations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          business_id: string | null
          category_id: string
          condition_code: string | null
          created_at: string
          currency_code: string
          deleted_at: string | null
          delivery_available: boolean
          description: string
          expires_at: string | null
          favorite_count: number
          id: string
          image_embedding: string | null
          listing_type: string
          location_id: string | null
          metadata: Json
          moderation_status: string
          offers_allowed: boolean
          pickup_available: boolean
          price_minor: number | null
          price_type: string
          published_at: string | null
          quantity: number
          seller_id: string
          source_language: string
          status: string
          title: string
          title_embedding: string | null
          transaction_type: string
          updated_at: string
          view_count: number
        }
        Insert: {
          business_id?: string | null
          category_id: string
          condition_code?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          delivery_available?: boolean
          description: string
          expires_at?: string | null
          favorite_count?: number
          id?: string
          image_embedding?: string | null
          listing_type?: string
          location_id?: string | null
          metadata?: Json
          moderation_status?: string
          offers_allowed?: boolean
          pickup_available?: boolean
          price_minor?: number | null
          price_type?: string
          published_at?: string | null
          quantity?: number
          seller_id: string
          source_language: string
          status?: string
          title: string
          title_embedding?: string | null
          transaction_type?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          business_id?: string | null
          category_id?: string
          condition_code?: string | null
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          delivery_available?: boolean
          description?: string
          expires_at?: string | null
          favorite_count?: number
          id?: string
          image_embedding?: string | null
          listing_type?: string
          location_id?: string | null
          metadata?: Json
          moderation_status?: string
          offers_allowed?: boolean
          pickup_available?: boolean
          price_minor?: number | null
          price_type?: string
          published_at?: string | null
          quantity?: number
          seller_id?: string
          source_language?: string
          status?: string
          title?: string
          title_embedding?: string | null
          transaction_type?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_source_language_fkey"
            columns: ["source_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      locations: {
        Row: {
          city: string | null
          country_code: string
          geog: unknown
          id: string
          latitude: number | null
          longitude: number | null
          municipality: string | null
          neighborhood: string | null
          postal_code: string | null
          province: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string
          geog?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string
          geog?: unknown
          id?: string
          latitude?: number | null
          longitude?: number | null
          municipality?: string | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string | null
        }
        Relationships: []
      }
      locker_shipments: {
        Row: {
          created_at: string
          dropoff_box_number: string | null
          dropoff_locker_id: string
          dropoff_pin: string | null
          dropped_off_at: string | null
          expires_at: string
          id: string
          order_id: string
          picked_up_at: string | null
          pickup_box_number: string | null
          pickup_locker_id: string
          pickup_pin: string | null
          pin_delivered_to_buyer: boolean
          pin_delivered_to_seller: boolean
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropoff_box_number?: string | null
          dropoff_locker_id: string
          dropoff_pin?: string | null
          dropped_off_at?: string | null
          expires_at: string
          id?: string
          order_id: string
          picked_up_at?: string | null
          pickup_box_number?: string | null
          pickup_locker_id: string
          pickup_pin?: string | null
          pin_delivered_to_buyer?: boolean
          pin_delivered_to_seller?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropoff_box_number?: string | null
          dropoff_locker_id?: string
          dropoff_pin?: string | null
          dropped_off_at?: string | null
          expires_at?: string
          id?: string
          order_id?: string
          picked_up_at?: string | null
          pickup_box_number?: string | null
          pickup_locker_id?: string
          pickup_pin?: string | null
          pin_delivered_to_buyer?: boolean
          pin_delivered_to_seller?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locker_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_key: string | null
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          moderation_status: string
          sender_id: string
        }
        Insert: {
          attachment_key?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_status?: string
          sender_id: string
        }
        Update: {
          attachment_key?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          moderation_status?: string
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
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          id: string
          notification_type: string
          payload: Json
          profile_id: string
          read_at: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          notification_type: string
          payload?: Json
          profile_id: string
          read_at?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          notification_type?: string
          payload?: Json
          profile_id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount_minor: number
          buyer_id: string
          created_at: string
          currency_code: string
          expires_at: string | null
          id: string
          listing_id: string
          message: string | null
          status: string
        }
        Insert: {
          amount_minor: number
          buyer_id: string
          created_at?: string
          currency_code?: string
          expires_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          status?: string
        }
        Update: {
          amount_minor?: number
          buyer_id?: string
          created_at?: string
          currency_code?: string
          expires_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency_code: string
          id: string
          listing_id: string
          platform_fee_minor: number
          quantity: number
          seller_id: string
          shipping_minor: number
          status: string
          subtotal_minor: number
          total_minor: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency_code?: string
          id?: string
          listing_id: string
          platform_fee_minor?: number
          quantity?: number
          seller_id: string
          shipping_minor?: number
          status?: string
          subtotal_minor: number
          total_minor: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          listing_id?: string
          platform_fee_minor?: number
          quantity?: number
          seller_id?: string
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          total_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          available_at: string
          event_type: string
          id: number
          last_error: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          available_at?: string
          event_type: string
          id?: never
          last_error?: string | null
          occurred_at?: string
          payload: Json
          processed_at?: string | null
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          available_at?: string
          event_type?: string
          id?: never
          last_error?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency_code: string
          id: string
          order_id: string
          paid_at: string | null
          payment_method: string | null
          provider: string
          provider_payment_id: string | null
          refunded_at: string | null
          status: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency_code?: string
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method?: string | null
          provider: string
          provider_payment_id?: string | null
          refunded_at?: string | null
          status: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency_code?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string | null
          provider?: string
          provider_payment_id?: string | null
          refunded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_number: number
          account_type: string
          ai_bonus_uses: number
          ai_photo_analysis_uses: number
          ai_subscription_current_period_end: string | null
          ai_subscription_status: string
          allow_seller_contact_on_favorite: boolean
          auth_user_id: string
          created_at: string
          digital_invoice_opt_in: boolean
          display_name: string | null
          email_verified: boolean
          id: string
          location_sharing_opt_in: boolean
          marketing_emails_opt_in: boolean
          marketing_listing_tips_opt_in: boolean
          marketing_news_opt_in: boolean
          marketing_partner_ads_opt_in: boolean
          marketing_promotions_opt_in: boolean
          marketing_surveys_opt_in: boolean
          notify_listing_favorited: boolean
          notify_new_messages: boolean
          notify_offers: boolean
          phone_number: string | null
          phone_verified: boolean
          postal_code: string | null
          preferred_city: string | null
          preferred_language: string | null
          status: string
          stripe_customer_id: string | null
          updated_at: string
          username: string
          website_url: string | null
        }
        Insert: {
          account_number?: number
          account_type?: string
          ai_bonus_uses?: number
          ai_photo_analysis_uses?: number
          ai_subscription_current_period_end?: string | null
          ai_subscription_status?: string
          allow_seller_contact_on_favorite?: boolean
          auth_user_id: string
          created_at?: string
          digital_invoice_opt_in?: boolean
          display_name?: string | null
          email_verified?: boolean
          id?: string
          location_sharing_opt_in?: boolean
          marketing_emails_opt_in?: boolean
          marketing_listing_tips_opt_in?: boolean
          marketing_news_opt_in?: boolean
          marketing_partner_ads_opt_in?: boolean
          marketing_promotions_opt_in?: boolean
          marketing_surveys_opt_in?: boolean
          notify_listing_favorited?: boolean
          notify_new_messages?: boolean
          notify_offers?: boolean
          phone_number?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferred_city?: string | null
          preferred_language?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          username: string
          website_url?: string | null
        }
        Update: {
          account_number?: number
          account_type?: string
          ai_bonus_uses?: number
          ai_photo_analysis_uses?: number
          ai_subscription_current_period_end?: string | null
          ai_subscription_status?: string
          allow_seller_contact_on_favorite?: boolean
          auth_user_id?: string
          created_at?: string
          digital_invoice_opt_in?: boolean
          display_name?: string | null
          email_verified?: boolean
          id?: string
          location_sharing_opt_in?: boolean
          marketing_emails_opt_in?: boolean
          marketing_listing_tips_opt_in?: boolean
          marketing_news_opt_in?: boolean
          marketing_partner_ads_opt_in?: boolean
          marketing_promotions_opt_in?: boolean
          marketing_surveys_opt_in?: boolean
          notify_listing_favorited?: boolean
          notify_new_messages?: boolean
          notify_offers?: boolean
          phone_number?: string | null
          phone_verified?: boolean
          postal_code?: string | null
          preferred_city?: string | null
          preferred_language?: string | null
          status?: string
          stripe_customer_id?: string | null
          updated_at?: string
          username?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_language_fkey"
            columns: ["preferred_language"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason_code: string
          reported_listing_id: string | null
          reported_message_id: string | null
          reported_profile_id: string | null
          reporter_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason_code: string
          reported_listing_id?: string | null
          reported_message_id?: string | null
          reported_profile_id?: string | null
          reporter_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason_code?: string
          reported_listing_id?: string | null
          reported_message_id?: string | null
          reported_profile_id?: string | null
          reporter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_listing_id_fkey"
            columns: ["reported_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_message_id_fkey"
            columns: ["reported_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_profile_id_fkey"
            columns: ["reported_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          category_id: string | null
          created_at: string
          filters: Json
          id: string
          is_active: boolean
          language_code: string | null
          name: string | null
          notification_frequency: string | null
          notify_email: boolean
          notify_push: boolean
          profile_id: string
          query_text: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          language_code?: string | null
          name?: string | null
          notification_frequency?: string | null
          notify_email?: boolean
          notify_push?: boolean
          profile_id: string
          query_text?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          language_code?: string | null
          name?: string | null
          notification_frequency?: string | null
          notify_email?: boolean
          notify_push?: boolean
          profile_id?: string
          query_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "saved_searches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_documents: {
        Row: {
          document: Json
          index_version: number
          indexed_at: string | null
          language_code: string
          last_error: string | null
          listing_id: string
          status: string
        }
        Insert: {
          document: Json
          index_version?: number
          indexed_at?: string | null
          language_code: string
          last_error?: string | null
          listing_id: string
          status?: string
        }
        Update: {
          document?: Json
          index_version?: number
          indexed_at?: string | null
          language_code?: string
          last_error?: string | null
          listing_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_documents_language_code_fkey"
            columns: ["language_code"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "search_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      search_worker_leases: {
        Row: {
          heartbeat_at: string | null
          lease_until: string | null
          leased_by: string | null
          worker_key: string
        }
        Insert: {
          heartbeat_at?: string | null
          lease_until?: string | null
          leased_by?: string | null
          worker_key: string
        }
        Update: {
          heartbeat_at?: string | null
          lease_until?: string | null
          leased_by?: string | null
          worker_key?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          carrier: string | null
          delivered_at: string | null
          id: string
          label_storage_key: string | null
          order_id: string
          shipped_at: string | null
          status: string
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          delivered_at?: string | null
          id?: string
          label_storage_key?: string | null
          order_id: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          delivered_at?: string | null
          id?: string
          label_storage_key?: string | null
          order_id?: string
          shipped_at?: string | null
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      vehicle_makes: {
        Row: {
          id: string
          is_active: boolean
          name: string
          stable_key: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          stable_key: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          stable_key?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          id: string
          is_active: boolean
          make_id: string
          name: string
          stable_key: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          make_id: string
          name: string
          stable_key: string
        }
        Update: {
          id?: string
          is_active?: boolean
          make_id?: string
          name?: string
          stable_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_make_id_fkey"
            columns: ["make_id"]
            isOneToOne: false
            referencedRelation: "vehicle_makes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      create_monthly_audit_partition: {
        Args: { month_start: string }
        Returns: undefined
      }
      current_profile_id: { Args: never; Returns: string }
      start_conversation: { Args: { p_listing_id: string }; Returns: string }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
