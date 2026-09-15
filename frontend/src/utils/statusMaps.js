/**
 * Maps raw status values to a human label and a visual tone.
 *
 * Accessibility rule: tone drives colour, but the label always renders too.
 * Colour must never be the only way a status is communicated.
 */

import { CLAIM_STATUS } from "./constants";

/** Tones map to the --color-*-soft token pairs in styles/tokens.css. */
export const TONES = {
  NEUTRAL: "neutral",
  PRIMARY: "primary",
  SUCCESS: "success",
  WARNING: "warning",
  DANGER: "danger",
  INFO: "info",
};

export const CLAIM_STATUS_META = {
  [CLAIM_STATUS.PENDING]: { label: "Pending", tone: TONES.WARNING },
  [CLAIM_STATUS.VERIFIED]: { label: "Verified", tone: TONES.SUCCESS },
  [CLAIM_STATUS.REJECTED]: { label: "Rejected", tone: TONES.DANGER },
};

const FALLBACK = { label: "Unknown", tone: TONES.NEUTRAL };

/**
 * Looks up display metadata for a status, tolerating unknown values so an
 * unexpected value degrades gracefully instead of crashing the page.
 */
export function getStatusMeta(map, value) {
  if (!value) return FALLBACK;
  return map[value] ?? { label: String(value), tone: TONES.NEUTRAL };
}
