# Furrow — Grain Market Intelligence System
## Master Design Document

**Status:** Design blueprint. Read this before building any phase. Every build prompt is an implementation of the principles defined here.

**Last updated:** June 2026

---

## 0. What we are building, in one paragraph

A market-intelligence engine for everyday corn and soybean farmers that fuses two things: (1) the most honest, comprehensive, well-sourced *situational read* of the grain market that exists for non-professionals, and (2) the farmer's *own position* — his break-even, how much he has left to sell, his storage and cash-flow reality. The engine ingests the same data buckets a commodity desk watches, reasons over them intelligently and transparently, and helps the farmer *decide* when to sell — without ever pretending to predict the price. It informs the decision; it never makes it. That honesty is the entire moat.

---

## 1. The First Principle: we do not predict price

This governs everything. Grain prices are not reliably predictable by anyone — not quants, not USDA, not a super-intelligence — because a price already reflects all public information and moves on the *next surprise*, which is by definition unknown. A tool that makes confident price calls will be confidently wrong on a schedule, and the first wrong call destroys trust permanently.

So we never output "price will go up," "sell now," or "this is the top." We output:
- **Situational awareness:** what is currently pushing the market up vs. down, weighted and sourced, with the net lean *right now* and what to watch next.
- **Decision math:** the farmer's own break-even against the live local cash price — pure arithmetic, always accurate, never a forecast.

The fusion of those two is the product. Everything else is in service of making each one excellent.

---

## 2. The Core Reasoning Principles

These are non-negotiable and apply to how EVERY data point is ingested and reasoned over, in every phase.

### 2.1 Reference-framing: nothing is a raw number
Almost no figure in this domain means anything in isolation. A number only has meaning against a reference frame. Every data point we ingest must arrive carrying its frame(s):
- **vs. last period** (month-over-month, week-over-week)
- **vs. last year** (same point in the season)
- **vs. the seasonal normal** (the 5-yr or multi-yr average for this date)
- **vs. expectation** (what the trade expected — when we have it)
- **vs. the pace required** (e.g. export sales vs. the weekly pace needed to hit USDA's annual target)

**Rule:** if we feed the synthesis engine raw numbers, we get shallow reads. If we feed *framed* numbers, we get intelligent ones. Framing is computed at ingestion, stored alongside the raw value, and passed to the engine. This is architectural, not per-phase.

### 2.2 Surprise, not level
A corollary of 2.1, important enough to state alone. Markets move on the gap between the actual number and what was expected — not the number itself. Low ending stocks are only bullish if they're *lower than expected*. We frequently will NOT have trade-expectation data (it's proprietary). When we don't, the engine must say so honestly: "ending stocks fell to X month-over-month — a tightening picture — but whether the market reads it as bullish depends on expectations we don't track." Never assert "low = bullish" on level alone.

### 2.3 Contradiction is surfaced, not blurred
Real markets are full of conflicting signals. A weak engine averages them into "mixed" and says nothing. A strong engine names the tension: "the dominant tension right now is strong export demand fighting a comfortable supply outlook." When signals disagree, the engine identifies the *axis* of disagreement and which side is currently dominant and why — transparently. Disagreement is information, not noise to be smoothed.

### 2.4 Grounding: every claim cites a real source
The engine reasons ONLY over the provided corpus. Every factor references a real, clickable source (a USDA query, an article link). It never invents numbers, quotes, or figures. If a claim isn't backed by an ingested item, it isn't made. This is the trust feature — the farmer can verify any factor. (Already implemented in Stage 2; carries forward.)

### 2.5 Domain humility, stated inline
Some data is widely misread. The engine carries explicit humility rules and states them where relevant:
- Crop condition ratings reflect current *sentiment*, not future yield — they're weak yield predictors and they swing. (From U of I farmdoc; already implemented.)
- WASDE figures move markets via surprise, not level (2.2).
- Weather forecasts beyond ~7 days are low-confidence (farmers know this; the engine should too).
- New humility rules get added here as we discover misread-prone data.

### 2.6 Honest on thin data
The read is only as good as the corpus. On a slow news week with stale data, the engine says "limited new information" and leans neutral rather than manufacturing a confident story. Reporting uncertainty is correct and valued, never a failure.

---

## 3. The Data Buckets (what a commodity desk watches)

Each bucket is a phase. Each phase must store **history (a time series), not just the latest snapshot** — this is what the later backtest research track mines. Each data point arrives reference-framed (§2.1).

| Bucket | Key signals | Why it moves price | Phase |
|---|---|---|---|
| **Supply** | WASDE ending stocks/carryout, production, Grain Stocks, Acreage, South American crop | The core supply/demand balance the whole market trades on | A |
| **Demand** | Weekly Export Sales (esp. China), daily flash sales, ethanol grind, soybean crush | Where the grain actually goes; China is *the* bean swing factor | B |
| **Money flow** | Commitment of Traders (fund net position), open interest | Shows how the big money is positioned *before* it moves | C |
| **Macro** | US dollar index, crude oil, freight; Corn Belt + S. America weather (as a *market* input) | Export competitiveness, ethanol/input costs, production risk | D |
| **Technicals** | Price vs. support/resistance, moving averages, trend, momentum | What the chart-driven traders act on (incl. our own users) | E |
| **News** | Ag-news corpus across all the above | Narrative, context, and early signal of surprises | DONE (Stage 1) |
| **Conditions** | USDA crop condition & progress (IL + national) | Current sentiment on crop health | DONE (Stage 1) |

---

## 4. The Synthesis Engine (how it reasons)

### 4.1 Weighting: empirical priors + AI adjustment (the hybrid)
The engine does NOT weight factors by vibes, and it does NOT use rigid fixed weights. It uses a **seasonal weighting framework** as scaffolding — priors that say, e.g., "in late June, acreage and weather dominate; demand is secondary; technicals are tertiary." The AI then adjusts within that frame and *shows its reasoning* for any adjustment.

**Where the framework comes from — two stages:**
- **v1 (now):** the framework is set from domain knowledge and the principles here — sensible, defensible seasonal priors (e.g. weather matters most July–Aug, acreage in late June/March, harvest pressure Sep–Nov, demand year-round). Honest, broad, not falsely precise.
- **v2 (after the backtest):** the framework's priors are *replaced/refined by the empirical weighting study* (§6) once we've accumulated history. The AI scaffolding stays; the numbers behind it get grounded in what actually moved the market.

### 4.2 Output structure (carries forward from Stage 2, enriched)
- **signal:** relative lean — favorable / mixed / unfavorable (NOT advice)
- **summary:** plain farmer English, Standard-Grain tone (direct, no hype, honest on uncertainty)
- **factors:** each with direction (up/down/neutral), a framed claim, a weight/prominence, and a clickable source
- **the dominant tension:** the main axis of disagreement and which side leads (§2.3)
- **watch_items:** upcoming events (report calendar) and unresolved questions
- **freshness:** what data, how recent, honestly labeled

### 4.3 Caching & cadence
Generate a few times a day, and regenerate on meaningful corpus change (new report, new USDA week, trend flip) — not every page load. (Already implemented; extend as buckets are added.)

---

## 5. Personal Fusion — the market read meets the farmer

This is what turns a newsletter into *his* tool. The generic read is the same for everyone; the *fused* read is his alone.

Inputs we have or will have: his break-even per crop, % of crop still unsold, storage situation, cash-flow timing, past sales. The same market conditions mean different things:
- 60% unsold + no storage left + price just above break-even → "you have real exposure here, and conditions lean X — worth close attention."
- 80% already sold + bins to spare + same price → "you're in a comfortable spot; you can be patient."

**Design:** the market read is generated once (it's shared, cacheable). The *fusion layer* is applied per-farmer on top — it takes the generic read + his position and produces a tailored framing and a personal relevance score. The market engine and the fusion layer are separate components (the market read never needs his data to run; the fusion never re-derives the market). This separation keeps the heavy AI call shared/cheap while the personal layer is light.

**The experience must feel futuristic and excellent** — see §8.

---

## 6. The Backtest / Weighting Research Track (separate build)

This is a research project that runs *on top of* the data layer, after enough history accumulates. It can be a separate Claude Code session. Its job: derive the empirical seasonal weighting framework (§4.1 v2) and validate it.

### 6.1 What it does
- Pull the accumulated historical time series for every bucket (which is why every phase stores history).
- Align each factor against subsequent price moves (short-term: days/weeks; longer-term: weeks/months).
- Run correlation / regression analysis to estimate which factors led price, by how much, and *in which seasons*.
- Output: grounded seasonal priors **with honest ranges**, not false-precision point weights.

### 6.2 The overfitting guardrails (critical — this is how the track stays honest)
- Derive **broad, stable** relationships, not precise ones. "Ending stocks surprises move price more than single export sales" (robust) — NOT "ending stocks have 2.3x the weight of exports in week 26" (noise).
- Use out-of-sample testing: fit on one period, check on another. A relationship that only holds in-sample is luck.
- Prefer relationships that make economic sense and are stable across years. Discard the rest.
- Re-run periodically (factors decay; relationships shift — e.g. corn↔crude tightened as ethanol scaled). The framework is living, re-validated, never frozen.

### 6.3 Why it comes later
You cannot backtest factors you aren't collecting. Phases A–E *are* the work of getting every factor flowing and historically stored. The backtest mines that accumulated record. Building the lab before the data exists is backwards.

---

## 7. Validation — how we know it's any good

We can't check the engine against future prices (we don't predict those). But we CAN check whether its read of the *current situation* is accurate and well-reasoned. Build this as a real step, not an afterthought.

### 7.1 The analyst-agreement test
Run the engine on a given week. Compare its read to what credible, independent analysts (U of I farmdoc, DTN, university extension) actually wrote about that same week. If the engine broadly agrees with the people who do this for a living, it's grounded. If it's off in left field, we catch it before a farmer does. Disagreement gets investigated — sometimes the engine missed something, sometimes it's a defensible different read.

### 7.2 The grounding audit
Spot-check that every factor traces to a real source and the framing is honest (surprise-not-level respected, humility rules applied, no invented numbers). Automatable in part.

### 7.3 The farmer gut-check
The ultimate test: does your dad / a real farmer read it and say "yeah, that's right" or "that's a robot"? Qualitative, irreplaceable. Happens after each meaningful engine change.

### 7.4 Iterate
Validation isn't a gate we pass once — it's a loop. Each run surfaces tuning (a humility rule to add, a weight to adjust, a source to include). The design improves continuously.

---

## 8. Experience & Design (the feel)

The intelligence must be matched by an interface that feels like a precision instrument from the future, not a data dump.

- **The terminal:** the News/Intelligence section becomes a true market-intelligence terminal — the situational read up top, the factors with their weights and sources, the report calendar counting down to the next market-mover, the data buckets explorable beneath. Sourced, filterable, alive.
- **Glanceable + deep:** the one-line read and net lean for the farmer who has 30 seconds; the full sourced reasoning and raw data for the one who wants to dig (your respondent).
- **Personal fusion, felt:** his break-even line, his % sold, his exposure — woven into the read, not bolted beside it.
- **The Furrow aesthetic:** dark precision-instrument look, amber signal accent, tabular-mono numbers, colorblind-safe direction, every metric carrying a plain-language explainer (the two-layer pattern is the app-wide standard). Honest freshness labels everywhere.
- **Futuristic but trustworthy:** motion and polish in service of clarity, never hype. It should feel expensive and quiet, like a tool a serious operator relies on.

---

## 9. Build Sequence

Each phase EXTENDS the existing Stage 1 (ingestion) + Stage 2 (synthesis) pipeline — never rebuilds it. Each stores history (§6.3). Each ingests reference-framed (§2.1).

1. **Phase A — Supply:** WASDE (ending stocks/carryout), Grain Stocks, Acreage + report calendar. Surprise-not-level rule. *(highest impact — the supply heavyweight)*
2. **Phase B — Demand:** Export Sales (China), flash sales, ethanol grind, crush. Pace-vs-target framing.
3. **Phase C — Money flow:** Commitment of Traders (fund positioning), open interest.
4. **Phase D — Macro:** dollar, crude, freight; Corn Belt + S. America weather as market input.
5. **Phase E — Technicals:** support/resistance, moving averages, trend, momentum.
6. **Phase F — Synthesis upgrade + the Intelligence Terminal:** seasonal weighting framework (v1), contradiction-surfacing, the full sourced terminal UI. Make it look extraordinary.
7. **Phase G — Personal Fusion:** fuse the market read with the farmer's position (break-even, % sold, storage). The tailored, personal read.
8. **Research Track (parallel/after):** the backtest weighting study (§6) + the validation harness (§7). Can be a separate Claude Code session. Refines Phase F's framework from priors to empirically grounded weights.

**Cross-cutting requirements baked into every phase:**
- Store time-series history, not just latest snapshot.
- Compute and store reference frames (§2.1) at ingestion.
- All external calls server-side, cached, fault-tolerant per-source.
- New data feeds the EXISTING corpus assembly with source_ids + clickable links.
- Extend the /markets/sources verification surface so we can SEE each new bucket's real data before trusting the synthesis on it.
- Migrations numbered sequentially; types regenerated; RLS service-role-only on global caches.

---

## 10. What stays true no matter what

- We inform the decision. We never make it.
- Every number carries its reference frame.
- We surface tension; we don't blur it.
- Every claim is sourced and verifiable.
- We're honest about what we don't know.
- The farmer's own position is half the product.
- We validate against reality and iterate forever.
- It should feel like the best, most trustworthy grain tool ever made — because it's the most honest one.
