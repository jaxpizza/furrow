# Furrow — Validation Findings Log

Running record of validation rounds per `VALIDATION_HARNESS_SPEC.md`. Each entry: what was tested, what it surfaced, how it was addressed. This is the evidence base for trusting the engine's reasoning.

---

## Round 1 — 2026-06-29 · Analyst-Agreement Test (Test 1) + Grounding/Framing Audits (Tests 2 & 4)

**Engine version:** post-keep-last-good (commit `7774367`), pre/post Rule-6 amendment (`4070fb9`).

**Week under test:** late June 2026 — a USDA **report week** (Quarterly Grain Stocks + June Acreage due June 30). Corn **and** soybeans. *Faithful, no reconstruction needed* — the corpus was the live current week.

**Method / honesty notes:**
- Engine reads generated on the real current corpus (real June 11 WASDE, real CFTC COT, real prices, real RSS news; export was a keep-last-good dated reading since FAS was down).
- **Ground truth = real independent analyst commentary**, fetched live (WebSearch/WebFetch) — Pro Farmer, DTN/Progressive Farmer, Total Farm Marketing, Brownfield, Price Group, AgWeb, farmdoc, Purdue extension. **No analyst commentary was fabricated**; sources with paywalls/403s were noted as inaccessible.
- Diversity-of-weeks caveat (honest): the news corpus is recent-only, so faithfully reconstructing a *past* week's corpus isn't possible. Instead, the single faithful current week spans report + weather + demand + positioning themes across two crops, giving factor-diversity. *Future rounds should accumulate weeks as the corpus history grows.*

### Engine data accuracy (verified vs reality)
All engine figures matched the real June 11 WASDE / March 31 reports **exactly**:
| | Engine | Reality | ✓ |
|---|---|---|---|
| Corn 2026/27 ending stocks | 1,960 mil bu, s2u 12.1% | 1.96B, s2u 12.1% | ✓ |
| Corn March-1 grain stocks | 9,024 mil bu, +877 (+11%) YoY | "9.02B, up 11%" | ✓ |
| Corn intended acres | 95.338M, −3.45M YoY | ~95.3M down YoY | ✓ |
| Soy 2026/27 ending stocks | 310 mil bu, −30 YoY, s2u 6.9% | 310M, down from 340 | ✓ |
| Soy production | 4,435 mil bu | 4.435B | ✓ |

### Test 2 — Grounding Audit (scripted)
- Every factor source resolves to a working URL — **PASS**, with one exception: the corn price/technicals factor's source ("Cash & futures trend") has **no clickable URL** (it's the internal live price feed). → minor finding (flagged below).
- No advice language anywhere — **PASS** (both crops).
- Condition / COT humility caveats present where those signals appear (in watched-context) — **PASS**.
- Disclaimer + NASS attribution present — **PASS**.

### Test 4 — Reference-Framing Audit (scripted)
- No bare numbers — **PASS** (both crops). Every figure carried a frame (Δ, vs-target, percentile, s2u).

### Test 1 — Analyst-Agreement (the main test)

**SOYBEAN — ALIGNED.**
- *Direction:* engine MIXED = analyst mixed/neutral, soy the relatively firmer crop. Match.
- *Factors:* tighter old-crop carryout, the corn→soy acreage shift (soy acres up = bearish new-crop), China + unknown-destination export demand (hedged), crush near target + biofuel growth, new-crop production +173 YoY. No miss, no invention.
- *Framing:* honest, well-hedged (export follow-through "uncertain," trend-yield, China not over-read). 6.9% s2u correctly read as tight.
- *Minor:* doesn't do the cross-crop *relative* lean analysts used ("soy firmer because not-corn") — but Furrow produces single-crop reads by design. Acceptable.

**CORN — OFF (before fix) → DEFENSIBLY DIFFERENT (after fix).**
- *The divergence:* every in-week independent source led with **building/record old-crop corn stocks** (June-1 stocks "highest since 1988," +16-17% YoY; "working through the record 17-bil-bu 2025 harvest") as the **bearish** anchor into the Grain-Stocks report. The engine framed corn supply net **"tightening/supportive"** off the new-crop YoY carryout decline, **omitted the March-1 stocks build (+11% YoY) entirely** — despite having it as a framed `[S#]` corpus item — and never surfaced that 12.1% stocks-to-use is historically comfortable. It promoted four supportive supply/demand factors and dropped the one pressuring supply number.
- *Why (root cause, confirmed):* a reproducible **prompt defect**, not a data bug — the grain-stocks figure was present and framed (`Grain Stocks 9024, Δyear +877`), and the engine even cited it in watch-items. Rules 6 (surprise-not-level) + 7 (sign-by-YoY-direction) structurally biased the engine toward YoY **direction** and away from **absolute level**, and permitted cherry-picking only the bullish supply changes. (The lone dissenting "corn tight, favor corn" source was Purdue, **March 23 — stale, pre-test-week**.)

### Findings & dispositions
| # | Finding | Type | Disposition |
|---|---|---|---|
| R1-1 | **Corn supply read one-sided** — surfaced bullish new-crop carryout decline, omitted bearish old-crop stocks build (+11%) and the comfortable ~12% s2u absolute level; inverted the supply sign vs the unanimous in-week analyst consensus. | **Clear reasoning bug** (rule defect) | **FIXED** — Rule 6 amended (`4070fb9`): (a) weigh absolute stocks-to-use level alongside YoY direction; (b) no cherry-picking — surface pressuring supply changes (a stocks build) too; (c) surface old-crop-vs-new-crop tension, with old-crop stocks prominence in a Grain-Stocks week. **Re-verified:** corn now makes the stocks build a `down` factor + notes the comfortable 12% s2u; supply lean up→neutral; soy stays aligned, reads its 6.9% s2u as tight (level confirms direction). |
| R1-2 | Corn price/technicals factor source ("Cash & futures trend") has no clickable URL (internal price feed). | Minor grounding gap | **FLAGGED** — judgment call on what to link (in-app chart vs a public quote page). Not fixed this round. |
| R1-3 | Engine produces single-crop reads; analysts often lead with the cross-crop *relative* lean (corn-vs-soy). | By-design limitation | **NOTED** — not a defect; flag if a future "compare crops" view is wanted. |

### Round verdict
The engine reasons **like a careful, humble analyst** — discipline (surprise-not-level, sentiment-not-yield, trend-yield humility, COT contrarianism, macro subordination) is analyst-grade and is *why* it avoids hype; data is exact. The one real failure was the **corn supply emphasis**, where that same discipline (direction-over-level) produced a read no in-week analyst held. It was a fixable rule defect, now addressed and re-verified. **Soybean: aligned. Corn: off→defensibly-different after the fix.** Re-run Test 1 on the next diverse week and after any synthesis change.
