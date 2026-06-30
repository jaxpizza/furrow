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
      alert_state: {
        Row: {
          armed: boolean
          farm_id: string
          id: string
          last_fired_at: string | null
          last_threshold_price: number | null
          target_id: string
          threshold_type: Database["public"]["Enums"]["alert_threshold_type"]
          updated_at: string
        }
        Insert: {
          armed?: boolean
          farm_id: string
          id?: string
          last_fired_at?: string | null
          last_threshold_price?: number | null
          target_id: string
          threshold_type: Database["public"]["Enums"]["alert_threshold_type"]
          updated_at?: string
        }
        Update: {
          armed?: boolean
          farm_id?: string
          id?: string
          last_fired_at?: string | null
          last_threshold_price?: number | null
          target_id?: string
          threshold_type?: Database["public"]["Enums"]["alert_threshold_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_state_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_state_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "breakeven_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      basis_entries: {
        Row: {
          basis_cents: number
          crop: Database["public"]["Enums"]["crop"]
          elevator_name: string | null
          farm_id: string
          id: string
          updated_at: string
        }
        Insert: {
          basis_cents: number
          crop: Database["public"]["Enums"]["crop"]
          elevator_name?: string | null
          farm_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          basis_cents?: number
          crop?: Database["public"]["Enums"]["crop"]
          elevator_name?: string | null
          farm_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "basis_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      breakeven_targets: {
        Row: {
          active: boolean
          cost_per_acre: number | null
          cost_per_bushel: number | null
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          effective_breakeven: number | null
          entry_mode: Database["public"]["Enums"]["alert_entry_mode"]
          expected_yield: number | null
          farm_id: string
          id: string
          profit_target_per_bushel: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          cost_per_acre?: number | null
          cost_per_bushel?: number | null
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          effective_breakeven?: number | null
          entry_mode?: Database["public"]["Enums"]["alert_entry_mode"]
          expected_yield?: number | null
          farm_id: string
          id?: string
          profit_target_per_bushel?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          cost_per_acre?: number | null
          cost_per_bushel?: number | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          effective_breakeven?: number | null
          entry_mode?: Database["public"]["Enums"]["alert_entry_mode"]
          expected_yield?: number | null
          farm_id?: string
          id?: string
          profit_target_per_bushel?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breakeven_targets_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      cot_cache: {
        Row: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at: string
          id: string
          payload: Json
          released_at: string | null
          report_date: string
          source_url: string | null
        }
        Insert: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          id?: string
          payload: Json
          released_at?: string | null
          report_date: string
          source_url?: string | null
        }
        Update: {
          crop?: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          id?: string
          payload?: Json
          released_at?: string | null
          report_date?: string
          source_url?: string | null
        }
        Relationships: []
      }
      crop_year_settings: {
        Row: {
          acres: number | null
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          expected_yield: number | null
          farm_id: string
          id: string
          updated_at: string
        }
        Insert: {
          acres?: number | null
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          expected_yield?: number | null
          farm_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          acres?: number | null
          crop?: Database["public"]["Enums"]["crop"]
          crop_year?: number
          expected_yield?: number | null
          farm_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_year_settings_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      elevator_basis: {
        Row: {
          basis: number | null
          created_at: string
          crop: Database["public"]["Enums"]["crop"] | null
          delivery_month: string | null
          elevator_name: string | null
          farm_id: string
          id: string
          quoted_date: string | null
        }
        Insert: {
          basis?: number | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"] | null
          delivery_month?: string | null
          elevator_name?: string | null
          farm_id: string
          id?: string
          quoted_date?: string | null
        }
        Update: {
          basis?: number | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"] | null
          delivery_month?: string | null
          elevator_name?: string | null
          farm_id?: string
          id?: string
          quoted_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elevator_basis_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_entries: {
        Row: {
          category: string
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          description: string | null
          entry_date: string
          farm_id: string
          id: string
          line_total: number | null
          quantity: number
          unit_cost: number
        }
        Insert: {
          category: string
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          description?: string | null
          entry_date?: string
          farm_id: string
          id?: string
          line_total?: number | null
          quantity?: number
          unit_cost?: number
        }
        Update: {
          category?: string
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          crop_year?: number
          description?: string | null
          entry_date?: string
          farm_id?: string
          id?: string
          line_total?: number | null
          quantity?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          state: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          state?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "farms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          acreage: number | null
          created_at: string
          farm_id: string
          geom: unknown
          id: string
          name: string
          rent_per_acre: number | null
          tenure: Database["public"]["Enums"]["tenure"]
        }
        Insert: {
          acreage?: number | null
          created_at?: string
          farm_id: string
          geom?: unknown
          id?: string
          name: string
          rent_per_acre?: number | null
          tenure?: Database["public"]["Enums"]["tenure"]
        }
        Update: {
          acreage?: number | null
          created_at?: string
          farm_id?: string
          geom?: unknown
          id?: string
          name?: string
          rent_per_acre?: number | null
          tenure?: Database["public"]["Enums"]["tenure"]
        }
        Relationships: [
          {
            foreignKeyName: "fields_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      grain_sales: {
        Row: {
          bushels: number | null
          buyer: string | null
          contract_type: string | null
          created_at: string
          crop: Database["public"]["Enums"]["crop"] | null
          crop_year: number | null
          farm_id: string
          id: string
          price_per_bushel: number | null
          sale_date: string | null
        }
        Insert: {
          bushels?: number | null
          buyer?: string | null
          contract_type?: string | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"] | null
          crop_year?: number | null
          farm_id: string
          id?: string
          price_per_bushel?: number | null
          sale_date?: string | null
        }
        Update: {
          bushels?: number | null
          buyer?: string | null
          contract_type?: string | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"] | null
          crop_year?: number | null
          farm_id?: string
          id?: string
          price_per_bushel?: number | null
          sale_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grain_sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_entries: {
        Row: {
          bushels: number
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          entry_date: string
          farm_id: string
          id: string
          moisture: number | null
          notes: string | null
          storage_location_id: string | null
        }
        Insert: {
          bushels: number
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          entry_date?: string
          farm_id: string
          id?: string
          moisture?: number | null
          notes?: string | null
          storage_location_id?: string | null
        }
        Update: {
          bushels?: number
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          crop_year?: number
          entry_date?: string
          farm_id?: string
          id?: string
          moisture?: number | null
          notes?: string | null
          storage_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "harvest_entries_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      harvests: {
        Row: {
          bushels: number | null
          created_at: string
          crop_year: number
          field_id: string
          harvested_date: string | null
          id: string
          moisture: number | null
          yield_per_acre: number | null
        }
        Insert: {
          bushels?: number | null
          created_at?: string
          crop_year: number
          field_id: string
          harvested_date?: string | null
          id?: string
          moisture?: number | null
          yield_per_acre?: number | null
        }
        Update: {
          bushels?: number | null
          created_at?: string
          crop_year?: number
          field_id?: string
          harvested_date?: string | null
          id?: string
          moisture?: number | null
          yield_per_acre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "harvests_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      input_purchases: {
        Row: {
          category: string | null
          created_at: string
          crop_year: number | null
          farm_id: string
          id: string
          product: string | null
          purchased_date: string | null
          quantity: number | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          crop_year?: number | null
          farm_id: string
          id?: string
          product?: string | null
          purchased_date?: string | null
          quantity?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          crop_year?: number | null
          farm_id?: string
          id?: string
          product?: string | null
          purchased_date?: string | null
          quantity?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "input_purchases_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_cache: {
        Row: {
          as_of: string
          fetched_at: string
          id: string
          payload: Json
          signal_type: string
          source_url: string | null
        }
        Insert: {
          as_of: string
          fetched_at?: string
          id?: string
          payload: Json
          signal_type: string
          source_url?: string | null
        }
        Update: {
          as_of?: string
          fetched_at?: string
          id?: string
          payload?: Json
          signal_type?: string
          source_url?: string | null
        }
        Relationships: []
      }
      market_history_cache: {
        Row: {
          as_of: string
          fetched_at: string
          points: Json
          source: string
          symbol: string
        }
        Insert: {
          as_of: string
          fetched_at?: string
          points: Json
          source?: string
          symbol: string
        }
        Update: {
          as_of?: string
          fetched_at?: string
          points?: Json
          source?: string
          symbol?: string
        }
        Relationships: []
      }
      market_outlook_cache: {
        Row: {
          crop: Database["public"]["Enums"]["crop"]
          factors: Json
          generated_at: string
          model: string
          signal: string
          summary: string
        }
        Insert: {
          crop: Database["public"]["Enums"]["crop"]
          factors: Json
          generated_at?: string
          model: string
          signal: string
          summary: string
        }
        Update: {
          crop?: Database["public"]["Enums"]["crop"]
          factors?: Json
          generated_at?: string
          model?: string
          signal?: string
          summary?: string
        }
        Relationships: []
      }
      market_outlook_v2: {
        Row: {
          corpus_hash: string
          crop: Database["public"]["Enums"]["crop"]
          generated_at: string
          id: string
          model: string
          payload: Json
        }
        Insert: {
          corpus_hash: string
          crop: Database["public"]["Enums"]["crop"]
          generated_at?: string
          id?: string
          model: string
          payload: Json
        }
        Update: {
          corpus_hash?: string
          crop?: Database["public"]["Enums"]["crop"]
          generated_at?: string
          id?: string
          model?: string
          payload?: Json
        }
        Relationships: []
      }
      market_quote_cache: {
        Row: {
          as_of: string
          currency: string
          fetched_at: string
          price: number
          source: string
          symbol: string
        }
        Insert: {
          as_of: string
          currency?: string
          fetched_at?: string
          price: number
          source?: string
          symbol: string
        }
        Update: {
          as_of?: string
          currency?: string
          fetched_at?: string
          price?: number
          source?: string
          symbol?: string
        }
        Relationships: []
      }
      news_items_cache: {
        Row: {
          crop_tags: Json
          fetched_at: string
          id: string
          link: string
          published_at: string | null
          source: string
          summary: string | null
          title: string
        }
        Insert: {
          crop_tags?: Json
          fetched_at?: string
          id?: string
          link: string
          published_at?: string | null
          source: string
          summary?: string | null
          title: string
        }
        Update: {
          crop_tags?: Json
          fetched_at?: string
          id?: string
          link?: string
          published_at?: string | null
          source?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      outlook_telemetry: {
        Row: {
          corpus_hash: string
          corpus_text: string | null
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          failed_sources: Json | null
          gaps: Json | null
          generated_at: string
          id: string
          input_snapshot: Json
          latency_ms: number | null
          model: string
          output: Json
          reasoning: Json
          sample_data: boolean
          signal: string
          trigger: string
        }
        Insert: {
          corpus_hash: string
          corpus_text?: string | null
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          failed_sources?: Json | null
          gaps?: Json | null
          generated_at: string
          id?: string
          input_snapshot: Json
          latency_ms?: number | null
          model: string
          output: Json
          reasoning: Json
          sample_data?: boolean
          signal: string
          trigger: string
        }
        Update: {
          corpus_hash?: string
          corpus_text?: string | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          failed_sources?: Json | null
          gaps?: Json | null
          generated_at?: string
          id?: string
          input_snapshot?: Json
          latency_ms?: number | null
          model?: string
          output?: Json
          reasoning?: Json
          sample_data?: boolean
          signal?: string
          trigger?: string
        }
        Relationships: []
      }
      plantings: {
        Row: {
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          field_id: string
          id: string
          planted_date: string | null
        }
        Insert: {
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          field_id: string
          id?: string
          planted_date?: string | null
        }
        Update: {
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          crop_year?: number
          field_id?: string
          id?: string
          planted_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantings_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          basis_at_fire: number | null
          cash_price_at_fire: number
          crop: Database["public"]["Enums"]["crop"]
          delivered_channels: Json
          farm_id: string
          fired_at: string
          futures_at_fire: number | null
          id: string
          status: Database["public"]["Enums"]["alert_status"]
          target_id: string
          threshold_price: number
          threshold_type: Database["public"]["Enums"]["alert_threshold_type"]
        }
        Insert: {
          basis_at_fire?: number | null
          cash_price_at_fire: number
          crop: Database["public"]["Enums"]["crop"]
          delivered_channels?: Json
          farm_id: string
          fired_at?: string
          futures_at_fire?: number | null
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          target_id: string
          threshold_price: number
          threshold_type: Database["public"]["Enums"]["alert_threshold_type"]
        }
        Update: {
          basis_at_fire?: number | null
          cash_price_at_fire?: number
          crop?: Database["public"]["Enums"]["crop"]
          delivered_channels?: Json
          farm_id?: string
          fired_at?: string
          futures_at_fire?: number | null
          id?: string
          status?: Database["public"]["Enums"]["alert_status"]
          target_id?: string
          threshold_price?: number
          threshold_type?: Database["public"]["Enums"]["alert_threshold_type"]
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_alerts_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "breakeven_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          close: number
          crop: Database["public"]["Enums"]["crop"]
          date: string
          high: number | null
          id: string
          low: number | null
          open: number | null
          source: string
        }
        Insert: {
          close: number
          crop: Database["public"]["Enums"]["crop"]
          date: string
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          source: string
        }
        Update: {
          close?: number
          crop?: Database["public"]["Enums"]["crop"]
          date?: string
          high?: number | null
          id?: string
          low?: number | null
          open?: number | null
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      report_calendar: {
        Row: {
          description: string
          id: string
          release_date: string
          report_type: string
        }
        Insert: {
          description: string
          id?: string
          release_date: string
          report_type: string
        }
        Update: {
          description?: string
          id?: string
          release_date?: string
          report_type?: string
        }
        Relationships: []
      }
      sale_entries: {
        Row: {
          bushels: number
          buyer: string | null
          created_at: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          entry_date: string
          farm_id: string
          id: string
          price: number
          storage_location_id: string | null
        }
        Insert: {
          bushels: number
          buyer?: string | null
          created_at?: string
          crop: Database["public"]["Enums"]["crop"]
          crop_year: number
          entry_date?: string
          farm_id: string
          id?: string
          price: number
          storage_location_id?: string | null
        }
        Update: {
          bushels?: number
          buyer?: string | null
          created_at?: string
          crop?: Database["public"]["Enums"]["crop"]
          crop_year?: number
          entry_date?: string
          farm_id?: string
          id?: string
          price?: number
          storage_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_entries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_entries_storage_location_id_fkey"
            columns: ["storage_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          capacity_bu: number | null
          created_at: string
          farm_id: string
          id: string
          kind: string
          name: string
          storage_cost_cents_per_bu_month: number | null
        }
        Insert: {
          capacity_bu?: number | null
          created_at?: string
          farm_id: string
          id?: string
          kind?: string
          name: string
          storage_cost_cents_per_bu_month?: number | null
        }
        Update: {
          capacity_bu?: number | null
          created_at?: string
          farm_id?: string
          id?: string
          kind?: string
          name?: string
          storage_cost_cents_per_bu_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_annotation: {
        Row: {
          annotated_by: string | null
          created_at: string
          id: string
          notes: string | null
          rating: string
          telemetry_id: string
        }
        Insert: {
          annotated_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating: string
          telemetry_id: string
        }
        Update: {
          annotated_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          rating?: string
          telemetry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_annotation_annotated_by_fkey"
            columns: ["annotated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemetry_annotation_telemetry_id_fkey"
            columns: ["telemetry_id"]
            isOneToOne: false
            referencedRelation: "outlook_telemetry"
            referencedColumns: ["id"]
          },
        ]
      }
      usda_demand_cache: {
        Row: {
          crop: Database["public"]["Enums"]["crop"]
          data_type: string
          fetched_at: string
          id: string
          marketing_year: string
          payload: Json
          period: string
          released_at: string | null
          source_url: string | null
        }
        Insert: {
          crop: Database["public"]["Enums"]["crop"]
          data_type: string
          fetched_at?: string
          id?: string
          marketing_year: string
          payload: Json
          period: string
          released_at?: string | null
          source_url?: string | null
        }
        Update: {
          crop?: Database["public"]["Enums"]["crop"]
          data_type?: string
          fetched_at?: string
          id?: string
          marketing_year?: string
          payload?: Json
          period?: string
          released_at?: string | null
          source_url?: string | null
        }
        Relationships: []
      }
      usda_econ_cache: {
        Row: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at: string
          id: string
          marketing_year: string
          payload: Json
          released_at: string
          report_type: string
          source_url: string | null
        }
        Insert: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          id?: string
          marketing_year: string
          payload: Json
          released_at: string
          report_type: string
          source_url?: string | null
        }
        Update: {
          crop?: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          id?: string
          marketing_year?: string
          payload?: Json
          released_at?: string
          report_type?: string
          source_url?: string | null
        }
        Relationships: []
      }
      usda_reports_cache: {
        Row: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at: string
          geography: string
          id: string
          payload: Json
          period: string
          report_type: string
          source_url: string | null
        }
        Insert: {
          crop: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          geography: string
          id?: string
          payload: Json
          period: string
          report_type: string
          source_url?: string | null
        }
        Update: {
          crop?: Database["public"]["Enums"]["crop"]
          fetched_at?: string
          geography?: string
          id?: string
          payload?: Json
          period?: string
          report_type?: string
          source_url?: string | null
        }
        Relationships: []
      }
      weather_actuals_cache: {
        Row: {
          cell_key: string
          fetched_at: string
          payload: Json
          year: number
        }
        Insert: {
          cell_key: string
          fetched_at?: string
          payload: Json
          year: number
        }
        Update: {
          cell_key?: string
          fetched_at?: string
          payload?: Json
          year?: number
        }
        Relationships: []
      }
      weather_forecast_cache: {
        Row: {
          cell_key: string
          fetched_at: string
          payload: Json
        }
        Insert: {
          cell_key: string
          fetched_at?: string
          payload: Json
        }
        Update: {
          cell_key?: string
          fetched_at?: string
          payload?: Json
        }
        Relationships: []
      }
      weather_normals_cache: {
        Row: {
          cell_key: string
          computed_at: string
          payload: Json
        }
        Insert: {
          cell_key: string
          computed_at?: string
          payload: Json
        }
        Update: {
          cell_key?: string
          computed_at?: string
          payload?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_farm_member: { Args: { f_id: string }; Returns: boolean }
      is_field_member: { Args: { fl_id: string }; Returns: boolean }
    }
    Enums: {
      alert_entry_mode: "per_bushel" | "per_acre_yield"
      alert_status: "unread" | "read" | "dismissed"
      alert_threshold_type: "breakeven" | "profit_target"
      crop: "corn" | "soybean"
      member_role: "owner" | "member"
      tenure: "owned" | "cash_rent" | "crop_share"
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
      alert_entry_mode: ["per_bushel", "per_acre_yield"],
      alert_status: ["unread", "read", "dismissed"],
      alert_threshold_type: ["breakeven", "profit_target"],
      crop: ["corn", "soybean"],
      member_role: ["owner", "member"],
      tenure: ["owned", "cash_rent", "crop_share"],
    },
  },
} as const
