/**
 * Mock Claim-Based Messages Store for NIE Mysuru.
 *
 * All communications are anchored to a specific `claim_id` for accountability.
 * Personal phone numbers and private email addresses are never exposed.
 */

import { mockResponse, mockError } from "./mockClient";

export let mockMessages = [
  {
    message_id: 1,
    claim_id: 1002,
    sender_id: 3,
    sender_name: "South Security Desk (Admin)",
    sender_role: "ADMIN",
    text: "Hello Kanakachala, your claim verification for the HP calculator has been approved. The item is safely stored at the South Security Office.",
    created_at: "2026-09-13 10:20:00",
  },
  {
    message_id: 2,
    claim_id: 1002,
    sender_id: 1,
    sender_name: "Kanakachala A",
    sender_role: "STUDENT",
    text: "Thank you Sir! What documents do I need to present for physical handover?",
    created_at: "2026-09-13 10:25:00",
  },
  {
    message_id: 3,
    claim_id: 1002,
    sender_id: 3,
    sender_name: "South Security Desk (Admin)",
    sender_role: "ADMIN",
    text: "Please bring your original physical NIE Student ID card and sign the campus recovery register at the desk.",
    created_at: "2026-09-13 10:28:00",
  },
  {
    message_id: 4,
    claim_id: 1001,
    sender_id: 1,
    sender_name: "Kanakachala A",
    sender_role: "STUDENT",
    text: "I have submitted the proof description for the bike keys. Let me know if you need any additional details.",
    created_at: "2026-09-14 11:22:00",
  },
];

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
