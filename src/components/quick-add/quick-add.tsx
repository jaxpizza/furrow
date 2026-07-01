"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, Plus, Receipt, Sprout, X } from "lucide-react";

import { ExpenseForm, HarvestForm, SaleForm } from "@/components/inputs/entry-forms";

export type QuickAddLocation = { id: string; name: string; kind: string };
export type QuickAddField = { id: string; name: string };
type Kind = "expense" | "sale" | "harvest";

/**
 * The app-wide fast path: a thumb-friendly "+" that opens a bottom sheet to log
 * an expense, sale, or harvest in a few taps. It renders the SAME shared forms
 * (entry-forms.tsx) the Inputs tab uses, so the fields are identical field-for-
 * field — writing to the same ledgers and feeding the same break-even — just in a
 * fast, mobile-friendly sheet. The Inputs page stays for detailed work.
 */
export function QuickAdd({
  farmId,
  cropYear,
  locations,
  fields,
}: {
  farmId: string;
  cropYear: number;
  locations: QuickAddLocation[];
  fields: QuickAddField[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const close = () => {
    setOpen(false);
    setKind(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add"
        className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-[var(--accent)] text-[#1b1403] shadow-lg shadow-black/40 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="size-7" strokeWidth={2.5} />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.div
              className="bg-bg-elevated border-border absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t px-4 pt-3 pb-8 sm:bottom-4 sm:rounded-2xl sm:border"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            >
              <div className="bg-border mx-auto mb-3 h-1 w-10 rounded-full sm:hidden" />
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {kind && (
                    <button type="button" onClick={() => setKind(null)} aria-label="Back">
                      <ArrowLeft className="text-text-tertiary size-4" />
                    </button>
                  )}
                  <span className="text-foreground text-sm font-semibold">
                    {kind === "expense" ? "Log expense" : kind === "sale" ? "Log sale" : kind === "harvest" ? "Log harvest" : "Quick log"}
                  </span>
                </div>
                <button type="button" onClick={close} aria-label="Close">
                  <X className="text-text-tertiary size-5" />
                </button>
              </div>

              {!kind ? (
                <TypePicker onPick={setKind} />
              ) : kind === "expense" ? (
                <ExpenseForm farmId={farmId} cropYear={cropYear} onDone={close} idPrefix="qa-exp" />
              ) : kind === "sale" ? (
                <SaleForm farmId={farmId} cropYear={cropYear} locations={locations} onDone={close} idPrefix="qa-sale" />
              ) : (
                <HarvestForm farmId={farmId} cropYear={cropYear} locations={locations} fields={fields} onDone={close} idPrefix="qa-harv" />
              )}
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TypePicker({ onPick }: { onPick: (k: Kind) => void }) {
  const opts = [
    { k: "expense" as const, label: "Expense", desc: "A cost you paid", Icon: Receipt },
    { k: "sale" as const, label: "Sale", desc: "Grain you sold", Icon: DollarSign },
    { k: "harvest" as const, label: "Harvest", desc: "Grain off the field", Icon: Sprout },
  ];
  return (
    <div className="space-y-2">
      {opts.map((o) => (
        <button
          key={o.k}
          type="button"
          onClick={() => onPick(o.k)}
          className="border-border bg-bg-surface/40 hover:border-[var(--accent)]/40 hover:bg-accent/40 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
            <o.Icon className="size-5" />
          </span>
          <span>
            <span className="text-foreground block text-sm font-medium">{o.label}</span>
            <span className="text-text-tertiary block text-xs">{o.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
