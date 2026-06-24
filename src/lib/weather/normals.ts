import "server-only";

import { ordinal, ORD_AUG1, ORD_JUL1 } from "./calc";
import {
  isFresh,
  NORMALS_TTL_MS,
  readNormalsCache,
  writeNormalsCache,
} from "./cache";
import { fetchArchive } from "./open-meteo";

export type Normals = {
  // 365 canonical-ordinal slots
  precipNormal: number[]; // avg daily precip (in)
  tmaxNormal: number[];
  tminNormal: number[];
  yearlyCumPrecip: number[][]; // [year][ordinal] cumulative precip (in)
  // average frost dates (canonical ordinals)
  frostSpringOrd: number;
  frostFallOrd: number;
  frostThreshold: number; // °F threshold used (cache-version marker)
};

const N = 365;

/**
 * Frost threshold (°F) applied to the ERA5 daily LOW. We use 36°F, not 32°F:
 * frost forms on the ground/canopy on calm clear nights when it cools below the
 * 2m air temperature, and the ERA5 grid-cell minimum runs a few degrees warmer
 * than the coldest spots. Empirically, 36°F on the ERA5 low reproduces the
 * station-based frost climatology (central IL ≈ last Apr 22 / first Oct 17,
 * ~178 frost-free days); 32°F overstates the season by ~3-4 weeks.
 */
export const FROST_THRESHOLD_F = 36;

/** Compute (or read cached) the 1991-2020 daily climatology for a cell. */
export async function getNormals(
  lat: number,
  lon: number,
  key: string,
): Promise<Normals | null> {
  const cached = await readNormalsCache<Normals>(key);
  // Reuse cache only if fresh AND computed with the current frost threshold
  // (recompute when the threshold or payload shape changes).
  if (
    cached &&
    isFresh(cached.ts, NORMALS_TTL_MS) &&
    cached.payload.frostThreshold === FROST_THRESHOLD_F
  ) {
    return cached.payload;
  }

  const arc = await fetchArchive(lat, lon, "1991-01-01", "2020-12-31");
  if (!arc?.daily?.time?.length) return cached?.payload ?? null;

  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } =
    arc.daily;

  // per-year precip + daily-min placed into ordinal slots
  const precipByYear = new Map<number, number[]>();
  const tminByYear = new Map<number, (number | null)[]>();
  const tmaxSum = new Array(N).fill(0);
  const tmaxCnt = new Array(N).fill(0);
  const tminSum = new Array(N).fill(0);
  const tminCnt = new Array(N).fill(0);
  const precipSum = new Array(N).fill(0);
  const precipCnt = new Array(N).fill(0);

  for (let i = 0; i < time.length; i++) {
    const [yStr, mStr, dStr] = time[i].split("-");
    const y = Number(yStr);
    const ord = ordinal(Number(mStr), Number(dStr)) - 1; // 0-based
    if (ord < 0 || ord >= N) continue;

    const p = precipitation_sum[i];
    const tx = temperature_2m_max[i];
    const tn = temperature_2m_min[i];

    if (!precipByYear.has(y)) precipByYear.set(y, new Array(N).fill(0));
    if (p != null) {
      precipByYear.get(y)![ord] += p;
      precipSum[ord] += p;
      precipCnt[ord] += 1;
    }
    if (tx != null) {
      tmaxSum[ord] += tx;
      tmaxCnt[ord] += 1;
    }
    if (tn != null) {
      tminSum[ord] += tn;
      tminCnt[ord] += 1;
      if (!tminByYear.has(y)) tminByYear.set(y, new Array(N).fill(null));
      tminByYear.get(y)![ord] = tn;
    }
  }

  const avg = (s: number[], c: number[]) =>
    s.map((v, i) => (c[i] ? v / c[i] : 0));

  const precipNormal = avg(precipSum, precipCnt);
  const tmaxNormal = avg(tmaxSum, tmaxCnt);
  const tminNormal = avg(tminSum, tminCnt);

  // per-year cumulative precip by ordinal
  const yearlyCumPrecip = [...precipByYear.values()].map((daily) => {
    const cum = new Array(N).fill(0);
    let run = 0;
    for (let i = 0; i < N; i++) {
      run += daily[i];
      cum[i] = run;
    }
    return cum;
  });

  // average frost dates: per year, last spring low ≤ threshold (before Jul) and
  // the first fall low ≤ threshold (from Aug), then average across years.
  const springOrds: number[] = [];
  const fallOrds: number[] = [];
  for (const tmins of tminByYear.values()) {
    let spring = -1;
    for (let o = 0; o < ORD_JUL1 - 1 && o < N; o++) {
      if (tmins[o] != null && (tmins[o] as number) <= FROST_THRESHOLD_F)
        spring = o;
    }
    let fall = -1;
    for (let o = ORD_AUG1 - 1; o < N; o++) {
      if (tmins[o] != null && (tmins[o] as number) <= FROST_THRESHOLD_F) {
        fall = o;
        break;
      }
    }
    if (spring >= 0) springOrds.push(spring + 1); // → 1-based
    if (fall >= 0) fallOrds.push(fall + 1);
  }
  const avgOrd = (a: number[]) =>
    a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : 0;

  const normals: Normals = {
    precipNormal,
    tmaxNormal,
    tminNormal,
    yearlyCumPrecip,
    frostSpringOrd: avgOrd(springOrds),
    frostFallOrd: avgOrd(fallOrds),
    frostThreshold: FROST_THRESHOLD_F,
  };
  await writeNormalsCache(key, normals);
  return normals;
}
