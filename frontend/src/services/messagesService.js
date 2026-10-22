/**
 * Service for Claim-Based Messages / Private Chat and Found-Item Conversation.
 *
 * FASTAPI INTEGRATION:
 * - GET  /api/claims/{claim_id}/messages
 * - POST /api/claims/{claim_id}/messages
 * - GET  /api/found-items/{item_id}/conversation
 * - POST /api/found-items/{item_id}/conversation/messages
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockClaimMessages,
  sendMockClaimMessage,
} from "./mock/mockMessages";

export async function getClaimMessages(claimId, otherUserId) {
  if (USE_MOCK) {
    return listMockClaimMessages(claimId);
  }

  if (!otherUserId) {
    throw new Error("The conversation user ID is required.");
  }

  return api.get(ENDPOINTS.CONVERSATION(otherUserId));
}

export async function sendClaimMessage(claimId, text, user, otherUserId) {
  if (USE_MOCK) {
    return sendMockClaimMessage(
      claimId,
      user?.user_id || 1,
      user?.name || "NIE Student",
      text,
      user?.role || "USER",
    );
  }

  if (!otherUserId) {
    throw new Error("The recipient user ID is required.");
  }

  return api.post(ENDPOINTS.MESSAGES, {
    receiver_id: Number(otherUserId),
    message_text: text,
  });
}

export async function getMyConversations() {
  if (USE_MOCK) {
    return [];
  }

  return api.get(ENDPOINTS.CONVERSATIONS);
}

export async function getFoundItemConversation(foundItemId, claimId = null) {
  if (USE_MOCK) {
    return {
      can_chat: false,
      messages: [],
    };
  }

  const params = claimId ? { claim_id: claimId } : undefined;
  return api.get(ENDPOINTS.FOUND_ITEM_CONVERSATION(foundItemId), { params });
}

export async function sendFoundItemMessage(foundItemId, text, claimId = null) {
  if (USE_MOCK) {
    return {
      message_id: Date.now(),
      text,
      created_at: new Date().toISOString(),
    };
  }

  const params = claimId ? { claim_id: claimId } : undefined;
  return api.post(ENDPOINTS.FOUND_ITEM_MESSAGES(foundItemId), { text }, { params });
}

export default {
  getClaimMessages,
  sendClaimMessage,
  getFoundItemConversation,
  sendFoundItemMessage,
};
