import { NextResponse } from "next/server";

import { evaluateAllFarms, evaluateFarm } from "@/lib/alerts/evaluate";

// Runs the break-even evaluator once per request. This route is built so a
// scheduled job can drive it later — Vercel Cron or a Supabase scheduled
// function pointed at POST /api/alerts/evaluate. Scheduling infra is wired
// SEPARATELY (not in this phase); the route just performs one evaluation pass
// when hit, and the same evaluator also runs on-demand when pages load.
//
// Auth: if CRON_SECRET is set, callers must send `Authorization: Bearer <secret>`
// (how Vercel Cron authenticates). With no secret set (local dev) it's open.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Fail SAFE: a missing secret in production must refuse, never run open.
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const farmId = new URL(req.url).searchParams.get("farm");
  const result = farmId
    ? await evaluateFarm(farmId)
    : await evaluateAllFarms();

  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
