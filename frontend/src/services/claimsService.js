/**
 * Service for Item Claims and Ownership Verification.
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - POST /api/claims
 * - GET  /api/claims/my-claims
 * - GET  /api/claims/{claim_id}
 * - GET  /api/found-items/{id}/verification-challenge
 * - POST /api/claims/{claim_id}/verify (Admin)
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockUserClaims,
  getMockClaimById,
  getMockVerificationChallenge,
  submitMockClaim,
  adminVerifyMockClaim,
  adminRejectMockClaim,
  listAllMockClaims,
} from "./mock/mockClaims";

export async function submitClaim(claimData, user) {
  if (USE_MOCK) {
    return submitMockClaim({
      ...claimData,
      claimant_user_id: user?.user_id || 1,
      claimant_name: user?.name || "NIE Student",
    });
  }

  return api.post(ENDPOINTS.CLAIMS, claimData);
}

export async function getMyClaims(userId) {
  if (USE_MOCK) {
    return listMockUserClaims(userId || 1);
  }

  return api.get(ENDPOINTS.MY_CLAIMS);
}

export async function getClaimById(claimId) {
  if (USE_MOCK) {
    return getMockClaimById(claimId);
  }

  return api.get(ENDPOINTS.CLAIM_DETAIL(claimId));
}

export async function getVerificationChallenge(foundItemId) {
  if (USE_MOCK) {
    return getMockVerificationChallenge(foundItemId);
  }

  return api.get(ENDPOINTS.VERIFICATION_CHALLENGE(foundItemId));
}

export async function verifyClaim(claimId, handoverInstructions) {
  if (USE_MOCK) {
    return adminVerifyMockClaim(claimId, handoverInstructions);
  }

  return api.post(ENDPOINTS.VERIFY_CLAIM(claimId), {
    status: "VERIFIED",
    handover_instructions: handoverInstructions,
  });
}

export async function rejectClaim(claimId, rejectionReason) {
  if (USE_MOCK) {
    return adminRejectMockClaim(claimId, rejectionReason);
  }

  return api.post(ENDPOINTS.VERIFY_CLAIM(claimId), {
    status: "REJECTED",
    rejection_reason: rejectionReason,
  });
}

export async function getAllClaims() {
  if (USE_MOCK) {
    return listAllMockClaims();
  }

  return api.get(ENDPOINTS.ADMIN_CLAIMS);
}

export default {
  submitClaim,
  getMyClaims,
  getClaimById,
  getVerificationChallenge,
  verifyClaim,
  rejectClaim,
  getAllClaims,
};
