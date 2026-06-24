import "server-only";

import { ordinal } from "./calc";
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
};

const N = 365;

/** Compute (or read cached) the 1991-2020 daily climatology for a cell. */
export async function getNormals(
  lat: number,
  lon: number,
  key: string,
): Promise<Normals | null> {
  const cached = await readNormalsCache<Normals>(key);
  if (cached && isFresh(cached.ts, NORMALS_TTL_MS)) return cached.payload;

  const arc = await fetchArchive(lat, lon, "1991-01-01", "2020-12-31");
  if (!arc?.daily?.time?.length) return cached?.payload ?? null;

  const { time, temperature_2m_max, temperature_2m_min, precipitation_sum } =
    arc.daily;

  // per-year precip placed into ordinal slots
  const precipByYear = new Map<number, number[]>();
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

  const normals: Normals = {
    precipNormal,
    tmaxNormal,
    tminNormal,
    yearlyCumPrecip,
  };
  await writeNormalsCache(key, normals);
  return normals;
}
