/**
 * Mock Claim-Based Messages Store for NIE Mysuru.
 *
 * All communications are anchored to a specific `claim_id` for accountability.
 * Personal phone numbers and private email addresses are never exposed.
 */

import { mockResponse, mockError } from "./mockClient";

export let mockMessages = [];

export function listMockClaimMessages(claimId) {
  const cid = Number(claimId);
  const msgs = mockMessages.filter((m) => m.claim_id === cid);
  return mockResponse(msgs);
}

export function sendMockClaimMessage(claimId, senderId, senderName, text, senderRole = "STUDENT") {
  if (!text || !text.trim()) {
    return mockError("Message text cannot be empty.", 400);
  }

  const cid = Number(claimId);
  const newMsg = {
    message_id: mockMessages.length + 1,
    claim_id: cid,
    sender_id: Number(senderId),
    sender_name: senderName || "NIE User",
    sender_role: senderRole,
    text: text.trim(),
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
  };

  mockMessages = [...mockMessages, newMsg];
  return mockResponse(newMsg, 201);
}
