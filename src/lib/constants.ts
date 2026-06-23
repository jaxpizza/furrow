/** Cookie remembering which farm the user last had selected. */
export const ACTIVE_FARM_COOKIE = "furrow-active-farm";

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
