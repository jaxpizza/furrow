-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║ Furrow — 0019: crop-OPTIONAL expenses (whole-farm costs)                        ║
-- ║ Not every cost is tied to one crop — fuel, parts, general maintenance are        ║
-- ║ whole-farm. Make expense_entries.crop NULLABLE: a NULL crop = "whole farm".      ║
-- ║                                                                                   ║
-- ║ Break-even stays honest: crop-tagged expenses hit that crop directly (as before), ║
-- ║ and whole-farm (NULL) expenses are ALLOCATED across corn/soybeans by ACREAGE       ║
-- ║ share (each crop's acres ÷ total acres, from crop_year_settings) inside            ║
-- ║ syncBreakeven — every real cost still lands in the break-even, never dropped.       ║
-- ║ Farm-scoped RLS is unchanged. The (farm_id, crop, crop_year) index still serves     ║
-- ║ per-crop lookups; NULL crop rows are simply excluded from an =crop filter.           ║
-- ╚════════════════════════════════════════════════════════════════════════════════╝

alter table public.expense_entries
  alter column crop drop not null;
