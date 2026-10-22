/**
 * Mock Claims & Ownership Verification Store for NIE Mysuru.
 *
 * CRITICAL SECURITY INVARIANT:
 * `ownership_verifications.expected_answer` MUST NEVER exist in this file,
 * in any mock responses, in memory objects, or anywhere accessible to the client.
 */

import { mockResponse, mockError } from "./mockClient";
import { CLAIM_STATUS } from "../../utils/constants";
import { mockFoundItems } from "./mockItems";

// In-memory mock claims collection
export let mockClaims = [];

// Optional challenge question prompts (NEVER stores or returns expected_answer)
const VERIFICATION_CHALLENGES = {
  1: "What distinguishing logo, key brand, or color is visible on the main key?",
  2: "What marking, sticker, or inscription is present inside the sliding cover?",
  5: "What brand or wattage rating is marked on the underside of the charger?",
};

function enrichClaimWithItem(claim) {
  const item = mockFoundItems.find((fi) => fi.id === claim.found_item_id);
  return {
    ...claim,
    item: item
      ? {
          id: item.id,
          item_name: item.item_name,
          category: item.category,
          location: item.location,
          specific_location: item.specific_location,
          custody_location: item.custody_location,
          contact_preference: item.contact_preference,
          date: item.date,
          image_url: item.image_url,
          status: item.status,
        }
      : null,
  };
}

/**
 * Returns claims for a specific student.
 */
export function listMockUserClaims(userId) {
  const uid = Number(userId);
  const userClaims = mockClaims
    .filter((c) => c.claimant_user_id === uid)
    .map(enrichClaimWithItem);
  return mockResponse(userClaims);
}

/**
 * Returns all claims (for Admin review).
 */
export function listAllMockClaims() {
  return mockResponse(mockClaims.map(enrichClaimWithItem));
}

/**
 * Returns a single claim by claim_id.
 */
export function getMockClaimById(claimId) {
  const cid = Number(claimId);
  const claim = mockClaims.find((c) => c.claim_id === cid);
  if (!claim) {
    return mockError("Claim record not found.", 404);
  }
  return mockResponse(enrichClaimWithItem(claim));
}

/**
 * Returns verification question prompt for a found item (without expected_answer).
 */
export function getMockVerificationChallenge(foundItemId) {
  const id = Number(foundItemId);
  const question = VERIFICATION_CHALLENGES[id] || null;
  return mockResponse({
    found_item_id: id,
    has_challenge: Boolean(question),
    question: question,
  });
}

/**
 * Submits a new claim.
 */
export function submitMockClaim({
  found_item_id,
  claimant_user_id,
  claimant_name,
  verification_details,
  lost_date,
  lost_location,
  claimant_answer = null,
  proof_image_url = null,
}) {
  const targetId = Number(found_item_id);
  const uid = Number(claimant_user_id);

  // Check if item exists
  const targetItem = mockFoundItems.find((fi) => fi.id === targetId);
  if (!targetItem) {
    return mockError("Target found item not found in campus registry.", 404);
  }

  // Prevent self-claim
  if (targetItem.user_id === uid) {
    return mockError("You cannot claim an item you reported as found.", 400);
  }

  // Prevent claiming closed or returned items
  if (targetItem.status === "CLAIMED" || targetItem.status === "RETURNED") {
    return mockError("This item has already been claimed or returned.", 400);
  }

  // Check for duplicate pending claims
  const existingPending = mockClaims.find(
    (c) =>
      c.found_item_id === targetId &&
      c.claimant_user_id === uid &&
      c.status === CLAIM_STATUS.PENDING,
  );
  if (existingPending) {
    return mockError(
      `You already have a pending claim (#CLM-${existingPending.claim_id}) for this item.`,
      400,
    );
  }

  const newClaimId = 1000 + mockClaims.length + 1;
  const newClaim = {
    claim_id: newClaimId,
    found_item_id: targetId,
    claimant_user_id: uid,
    claimant_name: claimant_name || "NIE Student",
    status: CLAIM_STATUS.PENDING,
    verification_details,
    lost_date,
    lost_location,
    claimant_answer,
    proof_image_url,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    reviewed_at: null,
    handover_instructions: null,
    rejection_reason: null,
  };

  mockClaims = [newClaim, ...mockClaims];
  return mockResponse(enrichClaimWithItem(newClaim), 201);
}

/**
 * Admin action: verify claim.
 */
export function adminVerifyMockClaim(claimId, handoverInstructions) {
  const cid = Number(claimId);
  const index = mockClaims.findIndex((c) => c.claim_id === cid);
  if (index === -1) return mockError("Claim not found", 404);

  const claim = mockClaims[index];
  const item = mockFoundItems.find((fi) => fi.id === claim.found_item_id);
  const custody = item?.custody_location || "Campus Security Office";

  mockClaims[index] = {
    ...claim,
    status: CLAIM_STATUS.VERIFIED,
    reviewed_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    handover_instructions:
      handoverInstructions ||
      `Please collect your item from ${custody} during regular hours with your physical NIE Student ID Card.`,
    rejection_reason: null,
  };

  if (item) {
    item.status = "CLAIMED";
  }

  return mockResponse(enrichClaimWithItem(mockClaims[index]));
}

/**
 * Admin action: reject claim.
 */
export function adminRejectMockClaim(claimId, rejectionReason) {
  const cid = Number(claimId);
  const index = mockClaims.findIndex((c) => c.claim_id === cid);
  if (index === -1) return mockError("Claim not found", 404);

  mockClaims[index] = {
    ...mockClaims[index],
    status: CLAIM_STATUS.REJECTED,
    reviewed_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    rejection_reason:
      rejectionReason ||
      "Submitted ownership details did not sufficiently match physical item verification marks.",
  };

  return mockResponse(enrichClaimWithItem(mockClaims[index]));
}
