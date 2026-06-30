/**
 * Convenience aliases over the generated database types. The full schema lives
 * in ./database.gen.ts (regenerated with `npm run db:types`); this file is the
 * stable surface the app imports, so regeneration can't break import sites.
 */
import type { Database, Json } from "./database.gen";

export type { Database, Json };

// Enum aliases (derived from the schema so they can't drift from SQL)
export type Tenure = Database["public"]["Enums"]["tenure"];
export type Crop = Database["public"]["Enums"]["crop"];
export type MemberRole = Database["public"]["Enums"]["member_role"];

// Row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Farm = Database["public"]["Tables"]["farms"]["Row"];
export type FarmMember = Database["public"]["Tables"]["farm_members"]["Row"];
export type Field = Database["public"]["Tables"]["fields"]["Row"];
export type Planting = Database["public"]["Tables"]["plantings"]["Row"];
