/**
 * Hand-authored types mirroring the SQL migrations in /supabase/migrations.
 * Keep in sync with the schema, or regenerate later with:
 *   supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 */

export type Tenure = "owned" | "cash_rent" | "crop_share";
export type Crop = "corn" | "soybean";
export type MemberRole = "owner" | "member";

type Timestamped = { created_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null } & Timestamped;
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: { full_name?: string | null };
        Relationships: [];
      };
      farms: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          state: string;
        } & Timestamped;
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          state?: string;
          created_at?: string;
        };
        Update: { name?: string; state?: string };
        Relationships: [];
      };
      farm_members: {
        Row: {
          farm_id: string;
          user_id: string;
          role: MemberRole;
        } & Timestamped;
        Insert: {
          farm_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: { role?: MemberRole };
        Relationships: [];
      };
      fields: {
        Row: {
          id: string;
          farm_id: string;
          name: string;
          geom: unknown | null;
          acreage: number | null;
          tenure: Tenure;
          rent_per_acre: number | null;
        } & Timestamped;
        Insert: {
          id?: string;
          farm_id: string;
          name: string;
          geom?: unknown | null;
          acreage?: number | null;
          tenure?: Tenure;
          rent_per_acre?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          geom?: unknown | null;
          acreage?: number | null;
          tenure?: Tenure;
          rent_per_acre?: number | null;
        };
        Relationships: [];
      };
      plantings: {
        Row: {
          id: string;
          field_id: string;
          crop_year: number;
          crop: Crop;
          planted_date: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          field_id: string;
          crop_year: number;
          crop: Crop;
          planted_date?: string | null;
          created_at?: string;
        };
        Update: {
          crop_year?: number;
          crop?: Crop;
          planted_date?: string | null;
        };
        Relationships: [];
      };
      input_purchases: {
        Row: {
          id: string;
          farm_id: string;
          crop_year: number | null;
          category: string | null;
          product: string | null;
          quantity: number | null;
          unit: string | null;
          unit_cost: number | null;
          total_cost: number | null;
          purchased_date: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          farm_id: string;
          crop_year?: number | null;
          category?: string | null;
          product?: string | null;
          quantity?: number | null;
          unit?: string | null;
          unit_cost?: number | null;
          total_cost?: number | null;
          purchased_date?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      harvests: {
        Row: {
          id: string;
          field_id: string;
          crop_year: number;
          bushels: number | null;
          moisture: number | null;
          yield_per_acre: number | null;
          harvested_date: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          field_id: string;
          crop_year: number;
          bushels?: number | null;
          moisture?: number | null;
          yield_per_acre?: number | null;
          harvested_date?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      grain_sales: {
        Row: {
          id: string;
          farm_id: string;
          crop_year: number | null;
          crop: Crop | null;
          bushels: number | null;
          price_per_bushel: number | null;
          buyer: string | null;
          contract_type: string | null;
          sale_date: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          farm_id: string;
          crop_year?: number | null;
          crop?: Crop | null;
          bushels?: number | null;
          price_per_bushel?: number | null;
          buyer?: string | null;
          contract_type?: string | null;
          sale_date?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      elevator_basis: {
        Row: {
          id: string;
          farm_id: string;
          elevator_name: string | null;
          crop: Crop | null;
          basis: number | null;
          delivery_month: string | null;
          quoted_date: string | null;
        } & Timestamped;
        Insert: {
          id?: string;
          farm_id: string;
          elevator_name?: string | null;
          crop?: Crop | null;
          basis?: number | null;
          delivery_month?: string | null;
          quoted_date?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_farm_member: {
        Args: { f_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      tenure: Tenure;
      crop: Crop;
      member_role: MemberRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Farm = Database["public"]["Tables"]["farms"]["Row"];
export type FarmMember = Database["public"]["Tables"]["farm_members"]["Row"];
export type Field = Database["public"]["Tables"]["fields"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"];
