# Furrow — Seasonal Weighting Framework (v1)

**Companion to the Master Design Document, §4.1.** This is the scaffolding the synthesis engine reasons within. It answers: at this point in the year, which signals dominate the grain market, and which are secondary?

**Status: v1 — domain-knowledge priors.** These are honest, broad, defensible weightings grounded in how the grain calendar actually works. They are NOT empirically precise. The backtest research track (Master Doc §6) will later refine these from historical data — but the *structure* (the AI reasons within a seasonal frame, adjusting with stated reasoning) stays the same.

**How the engine uses this:** the framework sets priors — "in late June, weather and the upcoming acreage report dominate; demand is secondary; technicals tertiary." The AI weights factors accordingly BUT may adjust when a secondary factor is doing something extreme (e.g. a shock China cancellation in July overrides the weather-dominant prior). When it adjusts, it states why. The framework is a strong default, not a straitjacket.

---

## Why grain markets are seasonal

The corn/soybean year has a rhythm. Different questions dominate at different times:
- **Winter (Dec–Feb):** last year's crop is in the bin; the market trades demand (exports, ethanol, crush) and South American weather/crop. Old-crop supply is largely known.
- **Spring (Mar–May):** the market shifts to the *coming* crop — how many acres, planting pace, early weather. The March Prospective Plantings and the start of planting set the tone.
- **Summer (Jun–Aug):** WEATHER IS KING. The crop is in the ground and its size is being determined. Pollination (corn, ~July) and pod-fill (soybeans, ~Aug) are the make-or-break windows. The late-June Acreage report is a major event. This is the most volatile, weather-driven stretch.
- **Fall (Sep–Nov):** harvest. Actual yields replace estimates. Harvest pressure (lots of grain hitting the market at once) weighs on price. Demand re-enters focus as the new crop's size becomes known.

The weighting framework encodes this rhythm.

---

## The framework by season

Weights are relative emphasis (high / medium / low), not numbers — v1 is about *which signals lead*, not false-precise coefficients.

### Winter — December, January, February
- **HIGH:** Demand (exports/China, ethanol, crush) · South American crop & weather · WASDE (Jan has the big annual Grain Stocks + final production)
- **MEDIUM:** Money flow (fund positioning) · Macro (dollar, crude)
- **LOW:** US weather (crop's in the bin) · US crop conditions (none in winter)
- **Dominant question:** "Is demand strong enough to draw down old-crop stocks, and is South America's crop coming in big or short?"

### Spring — March, April, May
- **HIGH:** Acreage intentions (March Prospective Plantings) · planting pace & early weather · WASDE (May = first new-crop S&D)
- **MEDIUM:** Demand · South American harvest (wrapping up) · money flow
- **LOW:** Technicals (fundamentals dominate the transition)
- **Dominant question:** "How many acres of each, and is planting going smoothly or getting delayed?"

### Summer — June, July, August  *(the volatile heart of the year)*
- **HIGH:** US WEATHER (Corn Belt) — pollination/pod-fill is decisive · crop conditions (now meaningful, but per humility rule = sentiment) · the late-June Acreage report (major event) · weather-driven WASDE revisions
- **MEDIUM:** Demand · money flow (funds chase weather scares)
- **LOW:** South America (off-season) · technicals
- **Dominant question:** "Is the weather making or breaking this crop right now?" Highest volatility, highest emotion.

### Fall — September, October, November
- **HIGH:** Actual harvest yields (replacing estimates) · harvest pressure · WASDE production updates (Sep/Oct/Nov firm up the real number)
- **MEDIUM:** Demand (re-entering focus) · money flow · basis (harvest basis behavior)
- **LOW:** US weather (crop made, though harvest weather matters for fieldwork) · conditions (winding down)
- **Dominant question:** "How big is the crop actually, and how much harvest pressure is on price?"

---

## Year-round signals (always at least MEDIUM)

Some signals never go to LOW because they always matter:
- **Price/basis trend** — always relevant; it's the thing being decided.
- **Money flow (COT)** — fund positioning matters year-round, spikes when funds chase a story.
- **Demand floor** — ethanol (corn) and crush (beans) provide a steady demand baseline that's always in play.

---

## Event overlays (spikes regardless of season)

Certain scheduled events spike specific signals' weight in the days around them, overriding the seasonal default:
- **WASDE release** (monthly) → supply/demand balance dominates for ~2 days around it
- **Grain Stocks** (Jan/Mar/Jun/Sep) → can shock the market; high weight on release
- **Acreage / Prospective Plantings** (Jun/Mar) → acres dominate around release
- **Weekly Export Sales** (Thursdays) → demand signal refreshes; weight rises if the number is a big surprise
- **COT** (Fridays) → fund-positioning refresh

The report calendar (built in Phase A) drives these overlays — the engine knows when an event is imminent and weights accordingly, AND lists it in watch_items.

---

## How this evolves (v1 → v2)

- **v1 (now):** the priors above, applied by the synthesis engine as scaffolding. Honest and broad.
- **v2 (after backtest):** the research track (Master Doc §6) analyzes accumulated history — does weather *actually* lead price more in July than June? By how much? Does fund positioning lead or lag? — and refines these priors with empirical, range-bounded weights. The seasonal *structure* is almost certainly right (it's how the physical crop works); the backtest sharpens the *magnitudes* and may surface non-obvious relationships (e.g. crude's growing influence on corn via ethanol).
- The framework is **living** — re-validated periodically, never frozen.

---

## The honesty guardrail on weighting

Even with empirical weights later, the engine never implies the weighting predicts price. The weighting governs *what to pay attention to right now* — it surfaces the signals most likely to be moving this market in this season. It is an attention-allocation tool, not a forecasting formula. A correctly-weighted read still ends at "here's what's moving the market and the net lean — you decide."
