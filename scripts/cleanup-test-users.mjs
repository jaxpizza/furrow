// Removes any leftover verification users (and their farms) from the live
// project. Matches emails beginning with the test prefixes used by the scripts
// and the UI smoke test. Run: node --env-file=.env.local scripts/cleanup-test-users.mjs
import { createClient } from "@supabase/supabase-js";
if (!globalThis.WebSocket) globalThis.WebSocket = class {};

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const PREFIXES = [
  "furrow.test.",
  "furrow.debug.",
  "furrow.ui.",
  "furrow.fields.",
  "furrow.geom.",
];
let removed = 0;

for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("listUsers error:", error.message);
    break;
  }
  const users = data.users ?? [];
  if (users.length === 0) break;
  for (const u of users) {
    if (PREFIXES.some((p) => (u.email ?? "").startsWith(p))) {
      await admin.from("farms").delete().eq("owner_id", u.id);
      await admin.auth.admin.deleteUser(u.id);
      removed++;
      console.log("removed", u.email);
    }
  }
  if (users.length < 200) break;
}

console.log(`\nDone. Removed ${removed} test user(s).`);
process.exit(0);
