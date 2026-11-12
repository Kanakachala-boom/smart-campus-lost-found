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

  return api.post(ENDPOINTS.CLAIMS, {
    found_item_id: Number(claimData.found_item_id || claimData.id),
    verification_details: claimData.verification_details,
    lost_date: claimData.lost_date || undefined,
    lost_location: claimData.lost_location || undefined,
    claimant_answer: claimData.claimant_answer || undefined,
    proof_image_url: claimData.proof_image_url || undefined,
    match_id: claimData.match_id ? Number(claimData.match_id) : undefined,
  });
}

export async function getMyClaims(userId) {
  if (USE_MOCK) {
    return listMockUserClaims(userId || 1);
  }

  // The backend derives the user ID from the JWT.
  return api.get(ENDPOINTS.MY_CLAIMS);
}

export async function getClaimById(claimId) {
  if (USE_MOCK) {
    return getMockClaimById(claimId);
  }

  return api.get(ENDPOINTS.CLAIM_DETAIL(claimId));
}

export async function getVerificationChallenge(claimId) {
  if (USE_MOCK) {
    return getMockVerificationChallenge(claimId);
  }

  return api.get(ENDPOINTS.VERIFICATION_CHALLENGE(claimId));
}

export async function submitVerificationAnswer(verificationId, answer) {
  if (USE_MOCK) {
    throw new Error(
      "Connect this action to your mock verification flow before using mock mode.",
    );
  }

  return api.post(
    `/ownership-verifications/${verificationId}/answer`,
    { answer },
  );
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

export async function getFoundItemClaims(foundItemId) {
  if (USE_MOCK) {
    return [];
  }

  return api.get(ENDPOINTS.FOUND_ITEM_CLAIMS(foundItemId));
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
  getFoundItemClaims,
  verifyClaim,
  rejectClaim,
  getAllClaims,
};
