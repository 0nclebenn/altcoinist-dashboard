/**
 * Shared analytics response types.
 */

export type FCRComposition = {
  /** Numerator — bot-resolved tickets where user tapped ✅ Resolved */
  confirmed_count: number;
  /** Denominator-only — silent closures (48h timeout) */
  auto_timeout_count: number;
  /** Denominator-only — bot-resolved but user said partial / no_help */
  unconfirmed_count: number;
  /** Denominator-only — bot-resolved but no CSAT response (data quality flag) */
  missing_csat_count: number;
  /** Denominator total — sum of confirmed + unconfirmed + missing + auto_timeout */
  total_bot_resolved: number;
  /** Excluded entirely from FCR — shown for transparency */
  human_resolved_excluded: number;
};

export type FCRResponse = {
  /** ISO date YYYY-MM-DD */
  from: string;
  /** ISO date YYYY-MM-DD */
  to: string;
  /** % FCR rounded to 2dp; null if total_bot_resolved == 0 */
  fcr_percent: number | null;
  composition: FCRComposition;
  /** ISO datetime of query execution */
  computed_at: string;
};
