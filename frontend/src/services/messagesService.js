/**
 * Service for Claim-Based Messages / Private Chat.
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - GET  /api/claims/{claim_id}/messages
 * - POST /api/claims/{claim_id}/messages
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockClaimMessages,
  sendMockClaimMessage,
} from "./mock/mockMessages";

export async function getClaimMessages(claimId) {
  if (USE_MOCK) {
    return listMockClaimMessages(claimId);
  }

  return api.get(ENDPOINTS.CLAIM_MESSAGES(claimId));
}

export async function sendClaimMessage(claimId, text, user) {
  if (USE_MOCK) {
    return sendMockClaimMessage(
      claimId,
      user?.user_id || 1,
      user?.name || "NIE Student",
      text,
      user?.role || "STUDENT",
    );
  }

  return api.post(ENDPOINTS.CLAIM_MESSAGES(claimId), { text });
}

export default {
  getClaimMessages,
  sendClaimMessage,
};
