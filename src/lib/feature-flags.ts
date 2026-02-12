/**
 * MVP Feature Flags
 *
 * Controls which features are active during the free MVP launch.
 * Set MVP_FREE_MODE = false to re-enable billing and premium gating.
 *
 * Keep this file as the single source of truth for launch toggles.
 */

/** Master switch: when true, billing is disabled and all users get MVP-level features for free. */
export const MVP_FREE_MODE = true;

/** Maximum search/matching radius (km) during MVP. */
export const MVP_RADIUS_KM = 25;

/** Maximum availability calendar horizon (days) during MVP. */
export const MVP_AVAILABILITY_HORIZON_DAYS = 60;

/** Soft cap on tenders posted AND tenders applied/quoted per calendar month during MVP. */
export const MVP_TENDERS_PER_MONTH_CAP = 3;

/** Whether email alerts are enabled during MVP. */
export const MVP_ALERTS_EMAIL_ENABLED = true;

/** Whether SMS alerts are enabled during MVP. */
export const MVP_ALERTS_SMS_ENABLED = true;

/** Whether "hide business name until engagement" is available during MVP. */
export const MVP_HIDE_BUSINESS_NAME_UNTIL_ENGAGEMENT = true;

/** Whether reliability insights (breakdown/details) are shown during MVP. */
export const MVP_RELIABILITY_INSIGHTS_ENABLED = true;

/** Whether priority dispute handling is enabled during MVP. */
export const MVP_PRIORITY_DISPUTES_ENABLED = true;

/** Whether highlighted reliability badges are shown during MVP. (Disabled at launch.) */
export const MVP_RELIABILITY_BADGES_ENABLED = false;
