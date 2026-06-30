# Furrow — Pre-Launch Punch List

Running list of known, deliberately-deferred items to resolve **before launch**. These were surfaced by the robustness audit and the validation round, judged non-blocking for current work, and parked here so nothing is lost. Each is a judgment call or low-severity polish, not a correctness/honesty bug (those were fixed when found).

**Convention:** when an item is resolved, move it to the "Resolved" section with the commit hash. Add new deferrals here as they're flagged.

---

## Open

### From the analyst-agreement validation (Round 1 — 2026-06-29)
- **PL-1 · Price/technicals factor source has no clickable URL.** The corn price/technicals factor cites "Cash & futures trend" (the internal live price feed), which has no public URL — so it's the one factor source a farmer can't click through to verify. *Decide:* link the in-app chart (`/markets`) or a public futures-quote page (e.g. the CME/Barchart corn or soybean quote). Low severity; everything else resolves. *(Validation log R1-2.)*
- **PL-2 · Single-crop reads vs. the cross-crop relative lean.** Furrow generates one read per crop by design; credible analysts often lead with the *relative* call ("soybeans own the upper hand vs. corn"). Consider a "compare crops" view or a relative-lean line in F2's terminal. By-design limitation, not a defect. *(Validation log R1-3.)*

### From the pre-terminal robustness audit (2026-06-28)
- **PL-3 · September pace-vs-target marketing-year seam.** `exportMarketingYear()` flips on Sep 1 but the WASDE target lookup prefers the "Est." (prior-year) value; for ~1–2 weeks each September a new-MY cumulative export total could be divided by the *old*-MY target, skewing the pace %. Seasonal, not active now. *Fix:* match the WASDE target to the same MY string FAS was queried for. (`src/lib/outlook/providers/usda-demand.ts`.) *(Robustness audit flag E.)*
- **PL-4 · Sources page technicals section shows no age.** Cosmetic honesty gap on the internal `/markets/sources` page — the Technicals section lacks the `fmtAgo` "updated N ago" line every peer section shows. Low priority. *(Robustness audit flag F.)*
- **PL-5 · Anthropic SDK 529 retry + request timeout.** Confirm the installed `@anthropic-ai/sdk` classifies HTTP **529 (overloaded)** as retryable under `maxRetries: 4` (historically 408/409/429/≥500 are retried; 529 is non-standard), and add an explicit per-request timeout so a hung model call can't stall a page render. If 529 isn't retried, the first overload falls straight to the graceful-degradation path. (`src/lib/outlook/synthesis.ts` `generate()`.) *(Robustness audit flag G.)*

---

## Resolved
*(Robustness audit flags A–D were fixed in-line and are recorded in their commits:)*
- Partial-bucket disclosure (flag A) — `951e92a`; keep-last-good extension — `40f5c3d`, `7774367`.
- TTL-skip-on-partial self-heal (flag B) — `e07893f`.
- Markets page `allSettled` resilience (flag D) — `d16a8b9`.
- Last-good staleness cap + banner (flag C) — `6ef13d3`.
- Wilder RSI / honest null-state / stale-feed badge — `8b58814`.
- Corn supply absolute-level + both-directions reasoning fix (validation R1-1) — `4070fb9`.
