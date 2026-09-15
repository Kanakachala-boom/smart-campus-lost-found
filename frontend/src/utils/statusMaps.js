/**
 * Maps raw status values to a human label and a visual tone.
 *
 * Accessibility rule: tone drives colour, but the label always renders too.
 * Colour must never be the only way a status is communicated.
 */

import { CLAIM_STATUS, MATCH_STATUS } from "./constants";

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
  [CLAIM_STATUS.PENDING]: { label: "Pending Review", tone: TONES.WARNING },
  [CLAIM_STATUS.VERIFIED]: { label: "Ownership Verified", tone: TONES.SUCCESS },
  [CLAIM_STATUS.REJECTED]: { label: "Claim Rejected", tone: TONES.DANGER },
};

export const MATCH_STATUS_META = {
  [MATCH_STATUS.PENDING]: { label: "Pending Review", tone: TONES.WARNING },
  [MATCH_STATUS.ACCEPTED]: { label: "Accepted", tone: TONES.SUCCESS },
  [MATCH_STATUS.REJECTED]: { label: "Dismissed", tone: TONES.NEUTRAL },
};

export const ITEM_STATUS = {
  ACTIVE: "ACTIVE",
  AVAILABLE: "AVAILABLE",
  POTENTIAL_MATCH: "POTENTIAL_MATCH",
  MATCHED: "MATCHED",
  CLAIMED: "CLAIMED",
  RETURNED: "RETURNED",
  RECLAIMED: "RECLAIMED",
  CLOSED: "CLOSED",
};

export const ITEM_STATUS_META = {
  [ITEM_STATUS.ACTIVE]: { label: "Active", tone: TONES.INFO },
  [ITEM_STATUS.AVAILABLE]: { label: "Available", tone: TONES.INFO },
  [ITEM_STATUS.POTENTIAL_MATCH]: { label: "Potential Match", tone: TONES.WARNING },
  [ITEM_STATUS.MATCHED]: { label: "Matched", tone: TONES.WARNING },
  [ITEM_STATUS.CLAIMED]: { label: "Claimed", tone: TONES.PRIMARY },
  [ITEM_STATUS.RETURNED]: { label: "Returned", tone: TONES.SUCCESS },
  [ITEM_STATUS.RECLAIMED]: { label: "Reclaimed", tone: TONES.SUCCESS },
  [ITEM_STATUS.CLOSED]: { label: "Closed", tone: TONES.NEUTRAL },
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

export function getClaimStatusMeta(status) {
  return getStatusMeta(CLAIM_STATUS_META, status);
}

export function getMatchStatusMeta(status) {
  return getStatusMeta(MATCH_STATUS_META, status);
}

export function getLostStatusMeta(status) {
  return getStatusMeta(ITEM_STATUS_META, status);
}

export function getFoundStatusMeta(status) {
  return getStatusMeta(ITEM_STATUS_META, status);
}

export function getItemStatusMeta(status) {
  return getStatusMeta(ITEM_STATUS_META, status);
}
