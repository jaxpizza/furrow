"use client";

import { useMemo, useRef, useState } from "react";
import type { Polygon } from "geojson";
import {
  Check,
  ClipboardList,
  Loader2,
  Map,
  PanelLeft,
  Pencil,
  Plus,
  Spline,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FIELD_COLUMNS, type FieldHarvest, type FieldPlanting, type MapField } from "@/lib/fields";
import { formatAcres, polygonToEWKT } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Crop } from "@/lib/types/database";

import { FieldForm, type FieldFormValues } from "./field-form";
import { FieldMap, type FieldMapHandle } from "./field-map";
import { FieldRecords } from "./field-records";
import { TenureBadge } from "./tenure-badge";

type Panel =
  | { kind: "list" }
  | { kind: "create"; geom: Polygon; acres: number }
  | { kind: "edit"; field: MapField }
  | { kind: "edit-geom"; field: MapField; geom: Polygon; acres: number }
  | { kind: "records"; field: MapField };

export function FieldsWorkspace({
  token,
  farmId,
  farmName,
  initialFields,
  initialPlantings,
  fieldHarvests,
}: {
  token: string;
  farmId: string;
  farmName: string;
  initialFields: MapField[];
  initialPlantings: FieldPlanting[];
  fieldHarvests: FieldHarvest[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const mapRef = useRef<FieldMapHandle>(null);

  const [fields, setFields] = useState<MapField[]>(initialFields);
  const [plantings, setPlantings] = useState<FieldPlanting[]>(initialPlantings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [isDrawing, setIsDrawing] = useState(false);
  const [liveAcres, setLiveAcres] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [recordPending, setRecordPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MapField | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalAcres = fields.reduce((s, f) => s + (f.acreage ?? 0), 0);

  async function reload(selectId?: string | null) {
    const { data } = await supabase
      .from("fields")
      .select(FIELD_COLUMNS)
      .eq("farm_id", farmId)
      .order("created_at", { ascending: true });
    const next: MapField[] = (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      acreage: r.acreage,
      tenure: r.tenure,
      rent_per_acre: r.rent_per_acre,
      geom: r.geom as unknown as Polygon,
    }));
    setFields(next);
    if (selectId !== undefined) setSelectedId(selectId);
    return next;
  }

  // ── draw new ──────────────────────────────────────────────────────────────
  function startDraw() {
    setSelectedId(null);
    setPanel({ kind: "list" });
    setLiveAcres(null);
    setIsDrawing(true);
    mapRef.current?.startDraw();
  }
  function cancelDraw() {
    setIsDrawing(false);
    setLiveAcres(null);
    mapRef.current?.cancel();
  }

  async function createField(geom: Polygon, v: FieldFormValues) {
    setPending(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("fields").insert({
      id,
      farm_id: farmId,
      name: v.name,
      acreage: v.acreage,
      tenure: v.tenure,
      rent_per_acre: v.rent_per_acre,
      geom: polygonToEWKT(geom),
    });
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    mapRef.current?.cancel();
    await reload(id);
    setPanel({ kind: "list" });
    toast.success(`${v.name} saved · ${formatAcres(v.acreage)} ac`);
  }

  // ── edit attributes ─────────────────────────────────────────────────────
  function openEdit(field: MapField) {
    setSelectedId(field.id);
    setPanel({ kind: "edit", field });
    mapRef.current?.flyToField(field);
  }
  async function saveAttrs(field: MapField, v: FieldFormValues) {
    setPending(true);
    const { error } = await supabase
      .from("fields")
      .update({
        name: v.name,
        acreage: v.acreage,
        tenure: v.tenure,
        rent_per_acre: v.rent_per_acre,
      })
      .eq("id", field.id);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await reload(field.id);
    setPanel({ kind: "list" });
    toast.success("Field updated");
  }

  // ── edit geometry ────────────────────────────────────────────────────────
  function enterEditGeom(field: MapField) {
    setSelectedId(field.id);
    setPanel({
      kind: "edit-geom",
      field,
      geom: field.geom,
      acres: field.acreage ?? 0,
    });
    mapRef.current?.startEditGeometry(field);
  }
  async function saveGeom(field: MapField, geom: Polygon, acres: number) {
    setPending(true);
    const { error } = await supabase
      .from("fields")
      .update({ geom: polygonToEWKT(geom), acreage: acres })
      .eq("id", field.id);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    mapRef.current?.cancel();
    await reload(field.id);
    setPanel({ kind: "list" });
    toast.success("Shape updated");
  }
  function cancelGeom() {
    mapRef.current?.cancel();
    setPanel({ kind: "list" });
  }

  // ── delete ───────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setPending(true);
    const { error } = await supabase
      .from("fields")
      .delete()
      .eq("id", deleteTarget.id);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const name = deleteTarget.name;
    setDeleteTarget(null);
    mapRef.current?.cancel();
    await reload(null);
    setPanel({ kind: "list" });
    toast.success(`${name} deleted`);
  }

  function selectFromList(field: MapField) {
    setSelectedId(field.id);
    mapRef.current?.flyToField(field);
  }

  // ── per-field records (plantings; harvest yield comes from tagged harvests) ──
  function openRecords(field: MapField) {
    setSelectedId(field.id);
    setPanel({ kind: "records", field });
    mapRef.current?.flyToField(field);
  }
  async function reloadPlantings() {
    const ids = fields.map((f) => f.id);
    if (ids.length === 0) return setPlantings([]);
    const { data } = await supabase
      .from("plantings")
      .select("id, field_id, crop, crop_year, planted_date")
      .in("field_id", ids);
    setPlantings(
      (data ?? []).map((p) => ({
        id: p.id, fieldId: p.field_id, crop: p.crop, cropYear: p.crop_year, plantedDate: p.planted_date,
      })),
    );
  }
  async function recordPlanting(fieldId: string, crop: Crop, cropYear: number) {
    setRecordPending(true);
    const { error } = await supabase
      .from("plantings")
      .upsert({ field_id: fieldId, crop, crop_year: cropYear }, { onConflict: "field_id,crop_year" });
    setRecordPending(false);
    if (error) return toast.error(error.message);
    await reloadPlantings();
    toast.success(`Planting saved · ${cropYear}`);
  }
  async function removePlanting(fieldId: string, cropYear: number) {
    setRecordPending(true);
    const { error } = await supabase.from("plantings").delete().eq("field_id", fieldId).eq("crop_year", cropYear);
    setRecordPending(false);
    if (error) return toast.error(error.message);
    await reloadPlantings();
    toast.success("Planting removed");
  }

  const busy = isDrawing || panel.kind !== "list";

  return (
    <div className="relative flex h-[calc(100dvh-7rem)] min-h-[460px] overflow-hidden rounded-lg border border-border">
      {/* ── Side panel ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "bg-bg-surface absolute inset-y-0 left-0 z-30 flex w-[88%] max-w-sm flex-col border-r border-border transition-transform md:static md:w-80 md:max-w-none md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* header */}
        <div className="border-b border-border/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{farmName}</div>
              <div className="text-text-tertiary text-[11px] tracking-wide uppercase">
                Mapped acres
              </div>
            </div>
            <div className="text-right">
              <div className="tnum text-2xl leading-none font-semibold">
                {formatAcres(totalAcres)}
              </div>
              <div className="text-text-tertiary tnum text-[11px]">
                {fields.length} field{fields.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
          <Button
            className="mt-3 w-full"
            onClick={startDraw}
            disabled={busy}
            size="sm"
          >
            <Plus className="size-4" />
            Draw field
          </Button>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {panel.kind === "create" && (
            <PanelShell
              title="New field"
              onClose={() => {
                mapRef.current?.cancel();
                setPanel({ kind: "list" });
              }}
            >
              <FieldForm
                mode="create"
                initial={{
                  name: "",
                  acreage: panel.acres,
                  tenure: "owned",
                  rent_per_acre: null,
                }}
                pending={pending}
                onCancel={() => {
                  mapRef.current?.cancel();
                  setPanel({ kind: "list" });
                }}
                onSubmit={(v) => createField(panel.geom, v)}
              />
            </PanelShell>
          )}

          {panel.kind === "edit" && (
            <PanelShell
              title="Edit field"
              onClose={() => setPanel({ kind: "list" })}
            >
              <FieldForm
                mode="edit"
                initial={{
                  name: panel.field.name,
                  acreage: panel.field.acreage,
                  tenure: panel.field.tenure,
                  rent_per_acre: panel.field.rent_per_acre,
                }}
                pending={pending}
                onCancel={() => setPanel({ kind: "list" })}
                onSubmit={(v) => saveAttrs(panel.field, v)}
                onEditGeometry={() => enterEditGeom(panel.field)}
              />
            </PanelShell>
          )}

          {panel.kind === "edit-geom" && (
            <PanelShell title="Edit shape" onClose={cancelGeom}>
              <div className="space-y-4">
                <p className="text-text-secondary text-sm leading-relaxed">
                  Drag the amber points to reshape{" "}
                  <span className="text-foreground font-medium">
                    {panel.field.name}
                  </span>
                  . Drag a midpoint to add a vertex.
                </p>
                <div className="rounded-md border border-border bg-bg-elevated p-3">
                  <div className="text-text-tertiary text-[11px] tracking-wide uppercase">
                    Acreage
                  </div>
                  <div className="tnum text-2xl font-semibold">
                    {formatAcres(panel.acres)}{" "}
                    <span className="text-text-secondary text-sm font-medium">
                      ac
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={cancelGeom}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() =>
                      saveGeom(panel.field, panel.geom, panel.acres)
                    }
                    disabled={pending}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    <Check className="size-4" />
                    Save shape
                  </Button>
                </div>
              </div>
            </PanelShell>
          )}

          {panel.kind === "records" && (
            <PanelShell title="Field record" onClose={() => setPanel({ kind: "list" })}>
              <FieldRecords
                field={panel.field}
                plantings={plantings}
                harvests={fieldHarvests}
                onRecordPlanting={(crop, year) => recordPlanting(panel.field.id, crop, year)}
                onDeletePlanting={(year) => removePlanting(panel.field.id, year)}
                pending={recordPending}
              />
            </PanelShell>
          )}

          {panel.kind === "list" &&
            (isDrawing ? (
              <DrawingBanner acres={liveAcres} onCancel={cancelDraw} />
            ) : fields.length === 0 ? (
              <EmptyPanel />
            ) : (
              <ul className="space-y-1">
                {fields.map((f) => (
                  <FieldRow
                    key={f.id}
                    field={f}
                    selected={f.id === selectedId}
                    onSelect={() => selectFromList(f)}
                    onRecords={() => openRecords(f)}
                    onEdit={() => openEdit(f)}
                    onDelete={() => setDeleteTarget(f)}
                  />
                ))}
              </ul>
            ))}
        </div>
      </div>

      {/* ── Map ───────────────────────────────────────────────────────────── */}
      <div className="relative flex-1">
        <FieldMap
          ref={mapRef}
          token={token}
          fields={fields}
          selectedId={selectedId}
          onDrawProgress={setLiveAcres}
          onDrawComplete={(geom, acres) => {
            setIsDrawing(false);
            setLiveAcres(null);
            setPanel({ kind: "create", geom, acres });
            setMobileOpen(true);
          }}
          onGeometryUpdate={(geom, acres) =>
            setPanel((p) =>
              p.kind === "edit-geom" ? { ...p, geom, acres } : p,
            )
          }
          onSelectField={(id) => {
            setSelectedId(id);
            if (id) {
              const f = fields.find((x) => x.id === id);
              if (f) mapRef.current?.flyToField(f);
            }
          }}
        />

        {/* mobile panel toggle */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="bg-bg-surface/90 absolute top-3 left-3 z-20 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium shadow-sm backdrop-blur md:hidden"
        >
          <PanelLeft className="size-4" />
          Fields
        </button>

        {/* drawing hint over the map */}
        {isDrawing && (
          <div className="bg-bg-surface/90 pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-md border border-border px-3 py-2 text-xs backdrop-blur">
            <span className="text-foreground font-medium">Click</span>{" "}
            <span className="text-text-secondary">
              to add points · double-click to finish
            </span>
          </div>
        )}

        {/* intentional empty state over the map */}
        {fields.length === 0 && !isDrawing && panel.kind === "list" && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-bg-surface/85 pointer-events-auto flex max-w-xs flex-col items-center gap-3 rounded-lg border border-border p-6 text-center backdrop-blur">
              <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-bg-elevated">
                <Map className="size-5 text-[var(--accent)]" />
              </div>
              <div className="space-y-1">
                <div className="font-semibold">Map your first field</div>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Trace a field boundary on the satellite imagery — acreage is
                  calculated for you.
                </p>
              </div>
              <Button size="sm" onClick={startDraw}>
                <Plus className="size-4" />
                Draw field
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete field?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <span className="text-foreground font-medium">
                    {deleteTarget.name}
                  </span>{" "}
                  ({formatAcres(deleteTarget.acreage)} ac) and its boundary will
                  be permanently removed. This can&apos;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              <Trash2 className="size-4" />
              Delete field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── subcomponents ───────────────────────────────────────────────────────────

function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          onClick={onClose}
          className="text-text-tertiary hover:text-foreground rounded p-1 transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function FieldRow({
  field,
  selected,
  onSelect,
  onRecords,
  onEdit,
  onDelete,
}: {
  field: MapField;
  selected: boolean;
  onSelect: () => void;
  onRecords: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "group flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors",
        selected
          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10"
          : "border-transparent hover:bg-accent/60",
      )}
    >
      <button
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {field.name}
          </span>
          <span className="tnum text-text-secondary text-xs">
            {formatAcres(field.acreage)} ac
            {field.rent_per_acre != null && (
              <span className="text-text-tertiary">
                {" "}
                · ${field.rent_per_acre}/ac
              </span>
            )}
          </span>
        </span>
        <TenureBadge tenure={field.tenure} />
      </button>
      <div
        className={cn(
          "flex items-center gap-0.5 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          onClick={onRecords}
          className="text-text-tertiary hover:text-[var(--accent)] rounded p-1.5 transition-colors"
          aria-label="Field records"
        >
          <ClipboardList className="size-3.5" />
        </button>
        <button
          onClick={onEdit}
          className="text-text-tertiary hover:text-foreground rounded p-1.5 transition-colors"
          aria-label="Edit field"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="text-text-tertiary rounded p-1.5 transition-colors hover:text-[var(--neg)]"
          aria-label="Delete field"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function DrawingBanner({
  acres,
  onCancel,
}: {
  acres: number | null;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Spline className="size-4 text-[var(--accent)]" />
        Drawing field
      </div>
      <div className="mt-3">
        <div className="text-text-tertiary text-[11px] tracking-wide uppercase">
          Live acreage
        </div>
        <div className="tnum text-3xl font-semibold">
          {acres != null ? formatAcres(acres) : "—"}{" "}
          <span className="text-text-secondary text-sm font-medium">ac</span>
        </div>
      </div>
      <p className="text-text-secondary mt-2 text-xs leading-relaxed">
        Click to drop points around the boundary, then double-click to finish.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 w-full"
        onClick={onCancel}
      >
        <X className="size-4" />
        Cancel
      </Button>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="px-2 py-8 text-center">
      <p className="text-text-secondary text-sm">No fields mapped yet.</p>
      <p className="text-text-tertiary mt-1 text-xs">
        Use “Draw field” to trace your first boundary.
      </p>
    </div>
  );
}
