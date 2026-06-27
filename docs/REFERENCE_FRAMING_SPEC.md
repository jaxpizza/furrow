# Furrow — Reference-Framing Specification

**Companion to the Master Design Document, §2.1.** This is the canonical table of how EVERY data point is framed at ingestion. No data point enters the corpus as a raw number — each carries its reference frame(s). Every phase implements its bucket according to this spec so framing is consistent across the whole system.

**The principle:** a raw number is nearly meaningless in this domain. "Ending stocks: 2.1B bushels" tells a farmer nothing. "Ending stocks fell 100M bushels month-over-month to 2.1B — the tightest in three years" tells him something. The frame IS the meaning. Compute it at ingestion, store it with the raw value, pass both to the synthesis engine.

---

## The standard frames

Every data point gets as many of these as apply:

- **Δ prior:** change since the last reading (week-over-week or month-over-month)
- **Δ year:** vs. the same point last year
- **vs. normal:** vs. the multi-year average for this date (the "seasonal normal" — typically 5-year)
- **vs. expectation:** vs. what the trade expected (only when we have it — usually we don't; be honest, see §2.2)
- **vs. pace needed:** vs. the run-rate required to hit an annual target (exports, mainly)
- **percentile / rank:** where this reading sits in its own historical distribution for this date
- **trend:** direction and slope over the last several readings (rising/falling/flat)

---

## Per-bucket framing

### Supply — WASDE ending stocks (carryout) [Phase A]
- **Δ prior:** MoM change (THE number traders watch on release day)
- **Δ year:** vs. last marketing year's carryout
- **vs. normal:** vs. recent multi-year carryout range
- **vs. expectation:** flag explicitly — we don't have trade polling; say so
- **stocks-to-use ratio:** carryout ÷ total use — the single best "is supply tight or loose" measure; frame vs. history
- **Humility:** surprise-not-level (§2.2). State that impact depends on expectations we don't track.

### Supply — production / yield [Phase A]
- **Δ prior, Δ year, vs. trend yield** (the trendline yield expectation for the year)
- Note: early-season USDA yield is a trend assumption, not a measurement — frame as such.

### Supply — Grain Stocks (quarterly) [Phase A]
- **Δ year** (same quarter last year), **vs. expectation** (flag missing). Surprises here are notorious market-movers.

### Supply — Acreage / Prospective Plantings [Phase A]
- **Δ year** (vs. last year's acres), **vs. prior intentions** (June Acreage vs. March Prospective Plantings — the change is the story)

### Supply — South American crop [Phase D or A-adjacent]
- **vs. last year, vs. early-season estimates** (Brazil/Argentina production trajectory; counter-season, so it matters most Nov–Mar)

### Demand — Export Sales (weekly) [Phase B]
- **vs. pace needed:** THE key frame — cumulative sales vs. the weekly pace required to hit USDA's annual export target. "Running ahead/behind pace."
- **Δ prior** (this week's sales vs. last), **Δ year** (vs. same week last year), **% to China** (the swing buyer)
- **trend** over recent weeks

### Demand — flash sales (daily) [Phase B]
- Event-framed: size + destination + vs. typical. A single large China flash sale is a signal; small routine ones are noise.

### Demand — ethanol grind (corn) [Phase B]
- **Δ prior, Δ year, vs. the pace needed** to hit annual ethanol-use estimate. Tie to crude/energy (Phase D).

### Demand — soybean crush [Phase B]
- **Δ prior, Δ year, vs. pace.** Crush margin context if available.

### Money flow — Managed Money net position (COT) [Phase C]
- **Δ prior:** week-over-week change (provided in the data)
- **net position:** long minus short — are funds net long or short?
- **percentile:** where current net sits in its historical range — THE key frame. Extreme positioning is the signal.
- **Humility:** aggregated, self-classified data — interpret with caution. Extreme positioning often *precedes reversals* (positioning, not prediction). State this.

### Macro — US dollar index [Phase D]
- **Δ prior, trend.** Frame: stronger dollar → US grain pricier abroad → demand headwind (and vice versa). Directional logic stated.

### Macro — crude oil [Phase D]
- **Δ prior, trend.** Frame: drives ethanol economics (corn) + input costs. Directional logic stated.

### Macro — macro weather (Corn Belt + S. America) [Phase D]
- **vs. normal** (drought monitor percentile), **forecast trend.** This is the MARKET weather (whole growing region), distinct from the farmer's field weather. Humility: >7-day forecasts are low-confidence.

### Technicals — price vs. levels [Phase E]
- **vs. support/resistance** (recent significant highs/lows), **vs. moving averages** (e.g. 50/100/200-day), **trend + momentum**, **percentile** of recent range. Frame: what chart-driven traders act on; not a prediction.

### Conditions — crop condition (already built, retrofit framing) [done → enrich]
- **Δ prior** (WoW change — often more telling than the level), **Δ year, vs. normal, IL vs. national.** Humility: sentiment not yield (already implemented).

---

## Implementation rules

1. **Framing is computed at ingestion**, stored in the cache payload alongside the raw value, never computed ad hoc downstream.
2. **When a frame requires data we don't have** (e.g. trade expectations), store an explicit "unavailable" marker so the engine can be honest about the gap rather than silently omitting it.
3. **The synthesis engine receives framed values**, and its prompt instructs it to reason from the frames, not the raw numbers — and to never state a raw figure without its frame.
4. **Historical storage** (per Master Doc §6.3): storing the time series is what lets us compute `vs. normal`, `percentile`, and `trend` — and feeds the backtest. Every framed value is also a historical row.
5. **Every framed value keeps its source URL** for grounding (§2.4).
