// End-to-end verification of the Furrow Phase 1 backend against the LIVE
// Supabase project. Exercises: signup → profiles trigger → farm insert (RLS) →
// farm_members trigger → the farm-switcher query → cross-tenant RLS isolation →
// sign out / sign back in. Run with:  node --env-file=.env.local scripts/verify-backend.mjs
import { createClient } from "@supabase/supabase-js";

// Node 20 has no global WebSocket; supabase-js eagerly inits a realtime client.
// We never use realtime here, so a stub keeps the constructor from throwing.
if (!globalThis.WebSocket) globalThis.WebSocket = class {};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

let pass = 0;
let fail = 0;
const ok = (m) => {
  pass++;
  console.log(`  \x1b[32m✓\x1b[0m ${m}`);
};
const bad = (m, e) => {
  fail++;
  console.log(`  \x1b[31m✗ ${m}\x1b[0m${e ? ` — ${e.message ?? e}` : ""}`);
};
const step = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ts = Date.now();
const u1 = { email: `furrow.test.${ts}.a@example.com`, password: "Test-Passw0rd-123" };
const u2 = { email: `furrow.test.${ts}.b@example.com`, password: "Test-Passw0rd-456" };
let user1Id, user2Id, farmId;
let emailConfirmationRequired = false;

try {
  // ── 1. SIGN UP (anon, exactly as the app does) ──────────────────────────────
  step("1. Sign up (anon signUp with full_name metadata)");
  const c1 = createClient(url, anon, { auth: { persistSession: false } });
  const { data: su, error: suErr } = await c1.auth.signUp({
    email: u1.email,
    password: u1.password,
    options: { data: { full_name: "Test Grower" } },
  });
  if (suErr) {
    bad("signUp returned an error", suErr);
  } else {
    ok(`signUp succeeded (user id ${su.user?.id?.slice(0, 8)}…)`);
    user1Id = su.user?.id;
    emailConfirmationRequired = !su.session;
    if (emailConfirmationRequired) {
      console.log(
        "  \x1b[33mℹ email confirmation is ON\x1b[0m — signUp returned no session. " +
          "In the UI this shows the 'check your email' toast and routes to /sign-in. " +
          "Confirming via admin API to verify the rest of the loop.",
      );
      await admin.auth.admin.updateUserById(user1Id, { email_confirm: true });
    } else {
      ok("session returned immediately (email confirmation is OFF)");
    }
  }

  // Authenticated client for user 1
  const auth1 = createClient(url, anon, { auth: { persistSession: false } });
  const { data: si1, error: si1Err } = await auth1.auth.signInWithPassword(u1);
  if (si1Err) bad("sign-in as user 1 failed", si1Err);
  else ok("signed in as user 1");
  user1Id = user1Id ?? si1?.user?.id;

  // ── 2. PROFILES trigger (handle_new_user) ───────────────────────────────────
  step("2. profiles row auto-created by on_auth_user_created trigger");
  const { data: prof, error: profErr } = await auth1
    .from("profiles")
    .select("*")
    .eq("id", user1Id)
    .maybeSingle();
  if (profErr) bad("reading own profile errored (RLS?)", profErr);
  else if (!prof) bad("no profiles row found for the new user (trigger missing?)");
  else {
    ok("profiles row exists for the new user");
    if (prof.full_name === "Test Grower")
      ok(`full_name propagated from signup metadata ("${prof.full_name}")`);
    else bad(`full_name not propagated (got ${JSON.stringify(prof.full_name)})`);
  }

  // ── 3. CREATE FARM (RLS insert as owner) ────────────────────────────────────
  // Mirrors the app: client-generated id, no RETURNING (the owner-membership is
  // created by an AFTER INSERT trigger that runs after the RLS RETURNING check).
  step("3. Create first farm (RLS: farms insert as owner, client-side id)");
  farmId = globalThis.crypto.randomUUID();
  const { error: farmErr } = await auth1
    .from("farms")
    .insert({ id: farmId, name: "Prairie Creek Farms", state: "IL", owner_id: user1Id });
  if (farmErr) {
    bad("farm insert failed", farmErr);
    farmId = undefined;
  } else {
    ok('farm created ("Prairie Creek Farms", IL)');
  }

  // ── 4. FARM_MEMBERS trigger (handle_new_farm) ───────────────────────────────
  step("4. farm_members owner row auto-created by on_farm_created trigger");
  if (farmId) {
    const { data: mem, error: memErr } = await auth1
      .from("farm_members")
      .select("*")
      .eq("farm_id", farmId);
    if (memErr) bad("reading farm_members errored (RLS?)", memErr);
    else if (!mem || mem.length === 0)
      bad("no farm_members row (trigger missing?)");
    else {
      ok(`exactly ${mem.length} membership row present`);
      const owner = mem[0];
      if (owner.user_id === user1Id) ok("membership user_id == creator");
      else bad("membership user_id mismatch");
      if (owner.role === "owner") ok('membership role == "owner"');
      else bad(`membership role is "${owner.role}", expected "owner"`);
    }
  }

  // ── 5. FARM-SWITCHER query (mirrors src/lib/farm.ts getSessionContext) ───────
  step("5. Farm-switcher data query returns the farm");
  const { data: switcher, error: swErr } = await auth1
    .from("farm_members")
    .select("role, farms (id, name, state)")
    .order("created_at", { ascending: true });
  if (swErr) bad("switcher query errored", swErr);
  else if (switcher?.length === 1 && switcher[0].farms?.name === "Prairie Creek Farms")
    ok("switcher query returns 1 farm with the joined farm record");
  else bad(`unexpected switcher result: ${JSON.stringify(switcher)}`);

  // ── 6. CROSS-TENANT RLS ISOLATION ───────────────────────────────────────────
  step("6. RLS isolation — a second, unrelated user cannot see farm 1");
  const created2 = await admin.auth.admin.createUser({
    email: u2.email,
    password: u2.password,
    email_confirm: true,
    user_metadata: { full_name: "Other Grower" },
  });
  user2Id = created2.data.user?.id;
  const auth2 = createClient(url, anon, { auth: { persistSession: false } });
  const { error: si2Err } = await auth2.auth.signInWithPassword(u2);
  if (si2Err) bad("sign-in as user 2 failed", si2Err);
  else ok("signed in as user 2 (no farm membership)");

  const { data: u2Farms } = await auth2.from("farms").select("*");
  if ((u2Farms?.length ?? 0) === 0) ok("user 2 sees 0 farms (cannot read farm 1)");
  else bad(`user 2 sees ${u2Farms.length} farm(s) — RLS leak!`);

  const { data: u2FarmById } = await auth2
    .from("farms")
    .select("*")
    .eq("id", farmId);
  if ((u2FarmById?.length ?? 0) === 0)
    ok("user 2 cannot read farm 1 by direct id (RLS enforced)");
  else bad("user 2 read farm 1 by id — RLS leak!");

  const { data: u2Members } = await auth2
    .from("farm_members")
    .select("*")
    .eq("farm_id", farmId);
  if ((u2Members?.length ?? 0) === 0)
    ok("user 2 cannot read farm 1's members (RLS enforced)");
  else bad("user 2 read farm 1's members — RLS leak!");

  const { data: u2Prof1 } = await auth2
    .from("profiles")
    .select("*")
    .eq("id", user1Id);
  if ((u2Prof1?.length ?? 0) === 0)
    ok("user 2 cannot read user 1's profile (profiles: own-row only)");
  else bad("user 2 read user 1's profile — RLS leak!");

  // ── 7. SIGN OUT / SIGN BACK IN ──────────────────────────────────────────────
  step("7. Sign out, then sign back in as user 1");
  await auth1.auth.signOut();
  const { data: after } = await auth1.auth.getSession();
  if (!after.session) ok("session cleared after signOut");
  else bad("session still present after signOut");
  const reAuth = createClient(url, anon, { auth: { persistSession: false } });
  const { data: si1b, error: si1bErr } = await reAuth.auth.signInWithPassword(u1);
  if (si1bErr) bad("re-sign-in failed", si1bErr);
  else if (si1b.session) {
    ok("re-sign-in succeeded, fresh session issued");
    const { data: f } = await reAuth.from("farms").select("name");
    if (f?.length === 1) ok("farm still visible after re-auth");
    else bad(`expected 1 farm after re-auth, got ${f?.length}`);
  }
} catch (e) {
  bad("unexpected exception", e);
} finally {
  // ── Cleanup: remove farm (cascades members) then the two test users ─────────
  step("Cleanup");
  try {
    if (farmId) await admin.from("farms").delete().eq("id", farmId);
    if (user1Id) await admin.auth.admin.deleteUser(user1Id);
    if (user2Id) await admin.auth.admin.deleteUser(user2Id);
    console.log("  test farm + users removed");
  } catch (e) {
    console.log(`  cleanup note: ${e.message ?? e}`);
  }

  console.log(
    `\n\x1b[1mRESULT:\x1b[0m ${pass} passed, ${fail} failed` +
      (emailConfirmationRequired
        ? "  (email confirmation: ON)"
        : "  (email confirmation: OFF)"),
  );
  process.exit(fail > 0 ? 1 : 0);
}
