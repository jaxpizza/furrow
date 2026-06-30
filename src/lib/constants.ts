/** Cookie remembering which farm the user last had selected. */
export const ACTIVE_FARM_COOKIE = "furrow-active-farm";

/** Admin "view-as" cookie — holds the target user id while an admin impersonates
 *  for support. Only honored when the real user is_admin (checked server-side). */
export const IMPERSONATE_COOKIE = "furrow-view-as";

/** US states for the farm-creation select. Illinois first — our launch market. */
export const US_STATES = [
  "IL",
  "IA",
  "IN",
  "OH",
  "MN",
  "WI",
  "MO",
  "NE",
  "KS",
  "SD",
  "ND",
  "MI",
  "KY",
  "TN",
] as const;
