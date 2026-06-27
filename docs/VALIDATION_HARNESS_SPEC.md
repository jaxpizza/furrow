# Furrow — Validation Harness Specification

**Companion to the Master Design Document, §7.** This turns "we'll know it's good afterward" into a concrete, runnable procedure. Validation is built, not hoped for — because validation is nobody's exciting feature and always gets skipped under build momentum unless it's specified as real work.

**What we can and cannot validate:**
- We CANNOT validate against future prices — we don't predict those, and noise would make any such test meaningless.
- We CAN validate that the engine's read of the *current situation* is accurate, grounded, and well-reasoned — by checking it against what credible independent analysts said about the same period, and by auditing its grounding.

---

## Test 1 — The Analyst-Agreement Test (the main one)

**Question:** Does the engine's read of a given week broadly match what credible, independent grain analysts wrote about that same week?

**Procedure:**
1. Pick a historical week where we have the corpus (USDA data + news as it stood that week).
2. Generate the engine's read for that week (corn and soybean).
3. Gather what independent analysts actually wrote that week: U of I farmdoc, DTN market commentary, university extension market reports, Farm Progress/Brownfield market wraps. (These are in or adjacent to our news corpus.)
4. Compare on three axes:
   - **Direction:** did the engine's net lean (favorable/mixed/unfavorable) align with the analysts' tone?
   - **Factors:** did the engine identify the same key drivers the analysts emphasized (the acreage report, a China sale, a weather scare)? Did it miss any major one? Did it invent any the analysts didn't mention?
   - **Framing:** did the engine frame things honestly (surprise-not-level, sentiment-not-yield) where the analysts did?

**Scoring (qualitative, structured):**
- **Aligned:** same direction, same major factors, honest framing → engine is grounded.
- **Defensibly different:** different emphasis but a reasonable read (analysts disagree too) → acceptable, note it.
- **Off:** missed a major driver, or invented one, or framed dishonestly → investigate and fix (tune prompt, add a humility rule, fix a data gap).

**Cadence:** run on several diverse historical weeks (a quiet week, a report week, a weather-scare week) before showing anyone. Re-run after any meaningful engine change.

---

## Test 2 — The Grounding Audit (partly automatable)

**Question:** Is every claim real, sourced, and honestly framed?

**Checks (can be scripted against the engine's structured output):**
- Every factor has a `source_id` that resolves to a real corpus item with a working URL. (No orphan/invented sources.)
- No factor states a numeric figure that doesn't appear in the cited source. (Catch hallucinated numbers.)
- Humility rules are respected: any factor resting on condition ratings flags the sentiment-not-yield caveat; any WASDE-level factor respects surprise-not-level; COT factors note the positioning caveat.
- The disclaimer and freshness footer are present and accurate.
- No advice language ("sell", "buy", "lock in") anywhere in the output.

**Cadence:** automated check on every generated read in development; spot-checked in production.

---

## Test 3 — The Farmer Gut-Check (irreplaceable)

**Question:** Does a real farmer read it and think "yeah, that's right" — or "that's a robot"?

**Procedure:** your dad and a few trusted farmers (the questionnaire respondents) read real generated reads and react. Capture specifically:
- Does the read match their own sense of the market that week?
- Does it sound like a sharp neighbor / the analyst they trust (Standard Grain), or like generic AI?
- Is anything obviously missing that they'd expect?
- Would they actually open it and act on it?

**Cadence:** after each meaningful engine change. This is the ultimate test; the other two exist to make sure we don't waste a farmer's time with something obviously broken.

---

## Test 4 — The Reference-Framing Audit

**Question:** Is the engine actually using frames, not raw numbers?

**Check:** scan the output for any bare figure stated without its frame ("ending stocks are 2.1B" with no Δ, no comparison). Every number in the farmer-facing read should carry meaning (a change, a comparison, a rank). Bare numbers are a regression — flag them.

---

## The validation loop

Validation is not a one-time gate. It's a continuous loop:
1. Generate reads.
2. Run Tests 1–4.
3. Each finding → a concrete fix (a prompt tweak, a new humility rule, a data-source addition, a framing correction).
4. Re-run. Improvement compounds.

**The validation findings log:** keep a running log of what each validation round surfaced and how it was addressed. This becomes the institutional memory of *why* the engine reasons the way it does — and the evidence base for trusting it.

---

## Relationship to the backtest track

The backtest (Master Doc §6) and validation are different:
- **Validation** asks "is the engine's read of the present accurate and honest?" (vs. analysts, vs. grounding rules) — qualitative, about reasoning quality.
- **Backtest** asks "which factors historically led price, to set the weighting?" — quantitative, about the weighting framework.

Both run on the accumulated data the phases produce. Validation can start as soon as the engine produces reads (now). Backtest needs accumulated history first.
