
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

export default {
  getClaimMessages,
  sendClaimMessage,
  getMyConversations,
};
