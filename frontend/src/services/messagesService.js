/**
 * Service for Claim-Based Messages / Private Chat and Found-Item Conversation.
 *
 * FASTAPI INTEGRATION:
 * - GET  /api/claims/{claim_id}/messages
 * - POST /api/claims/{claim_id}/messages
 * - GET  /api/messages/conversations
 * - GET  /api/messages/conversation/{other_user_id}
 * - POST /api/messages
 * - GET  /api/found-items/{item_id}/conversation
 * - POST /api/found-items/{item_id}/conversation/messages
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockClaimMessages,
  sendMockClaimMessage,
} from "./mock/mockMessages";

export async function getClaimMessages(claimId, otherUserId = null) {
  if (USE_MOCK) {
    return listMockClaimMessages(claimId);
  }

  if (claimId) {
    return api.get(ENDPOINTS.CLAIM_MESSAGES(claimId));
  }

  if (otherUserId) {
    return api.get(ENDPOINTS.CONVERSATION(otherUserId));
  }

  throw new Error("A claim ID or conversation user ID is required.");
}

export async function sendClaimMessage(claimId, text, user = null, otherUserId = null) {
  if (USE_MOCK) {
    return sendMockClaimMessage(
      claimId,
      user?.user_id || 1,
      user?.name || "NIE Student",
      text,
      user?.role || "USER",
    );
  }

  if (claimId) {
    return api.post(ENDPOINTS.CLAIM_MESSAGES(claimId), {
      text,
    });
  }

  if (otherUserId) {
    return api.post(ENDPOINTS.MESSAGES, {
      receiver_id: Number(otherUserId),
      text,
    });
  }

  throw new Error("A claim ID or recipient user ID is required.");
}

export async function getMyConversations() {
  if (USE_MOCK) {
    return [];
  }

  return api.get(ENDPOINTS.CONVERSATIONS);
}

export async function getUserConversation(userId) {
  if (USE_MOCK) {
    return [];
  }

  return api.get(ENDPOINTS.CONVERSATION(userId));
}

export async function sendMessage(payload) {
  if (USE_MOCK) {
    return {
      message_id: Date.now(),
      ...payload,
      created_at: new Date().toISOString(),
    };
  }

  return api.post(ENDPOINTS.MESSAGES, {
    receiver_id: Number(payload.receiver_id || payload.recipient_id),
    text: payload.text || payload.message || payload.message_text,
    claim_id: payload.claim_id ? Number(payload.claim_id) : undefined,
  });
}

export async function markMessageRead(messageId) {
  if (USE_MOCK) {
    return { success: true };
  }

  return api.patch(`/api/messages/${messageId}/read`);
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
  getMyConversations,
  getUserConversation,
  sendMessage,
  markMessageRead,
  getFoundItemConversation,
  sendFoundItemMessage,
};
