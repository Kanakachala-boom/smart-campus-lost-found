
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

  // Backend expects { match_id: number }.
  return api.post(ENDPOINTS.CLAIMS, {
    match_id: Number(claimData.match_id),
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

  // Backend review endpoint accepts APPROVED or REJECTED.
  return api.patch(ENDPOINTS.CLAIM_REVIEW(claimId), {
    status: "APPROVED",
  });
}

export async function rejectClaim(claimId, rejectionReason) {
  if (USE_MOCK) {
    return adminRejectMockClaim(claimId, rejectionReason);
  }

  return api.patch(ENDPOINTS.CLAIM_REVIEW(claimId), {
    status: "REJECTED",
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
  submitVerificationAnswer,
  verifyClaim,
  rejectClaim,
  getAllClaims,
};
