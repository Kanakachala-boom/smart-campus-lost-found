/**
 * Mock Targeted Notifications Store for NIE Mysuru.
 *
 * Implements two-way notifications:
 * - Match alert to lost reporter when matching found item arrives
 * - Match alert to found reporter when matching lost item arrives
 * - Claim submission & status transition alerts
 */

import { mockResponse, mockError } from "./mockClient";

export let mockNotifications = [
  {
    notification_id: 1,
    user_id: 1,
    type: "POTENTIAL_MATCH",
    title: "Potential Match Found",
    message:
      "A report for 'HP Scientific Calculator' closely matches your lost report 'Casio fx-991CW Calculator' in the Golden Jubilee Block.",
    item_id: 2,
    item_type: "found",
    is_read: false,
    created_at: "2026-09-15 10:30:00",
    target_url: "/items/found/2",
  },
  {
    notification_id: 2,
    user_id: 1,
    type: "CLAIM_VERIFIED",
    title: "Ownership Claim Verified",
    message:
      "Your claim #CLM-1002 has been approved by campus authorities. Please collect your item from South Campus Security Office.",
    item_id: 2,
    item_type: "found",
    is_read: false,
    created_at: "2026-09-14 14:15:00",
    target_url: "/claims/1002",
  },
  {
    notification_id: 3,
    user_id: 1,
    type: "CLAIM_SUBMITTED",
    title: "Claim Submitted on Found Item",
    message:
      "A student has submitted an ownership claim for 'Set of 3 Bike Keys' you reported. Department staff are evaluating verification marks.",
    item_id: 1,
    item_type: "found",
    is_read: true,
    created_at: "2026-09-13 11:35:00",
    target_url: "/my-reports",
  },
  {
    notification_id: 4,
    user_id: 1,
    type: "POTENTIAL_MATCH",
    title: "Match Alert for Found Report",
    message:
      "A newly filed lost report matches 'USB-C 65W Fast Charger' reported by you. The owner has been notified.",
    item_id: 5,
    item_type: "found",
    is_read: true,
    created_at: "2026-09-12 16:00:00",
    target_url: "/items/found/5",
  },
];

export function listMockUserNotifications(userId) {
  const uid = Number(userId);
  const userNotifs = mockNotifications.filter((n) => n.user_id === uid);
  return mockResponse(userNotifs);
}

export function getMockUnreadCount(userId) {
  const uid = Number(userId);
  const count = mockNotifications.filter((n) => n.user_id === uid && !n.is_read).length;
  return mockResponse({ unread_count: count });
}

export function markMockNotificationRead(notificationId) {
  const nid = Number(notificationId);
  const index = mockNotifications.findIndex((n) => n.notification_id === nid);
  if (index === -1) return mockError("Notification not found", 404);

  mockNotifications[index] = {
    ...mockNotifications[index],
    is_read: true,
  };

  return mockResponse(mockNotifications[index]);
}

export function markAllMockNotificationsRead(userId) {
  const uid = Number(userId);
  mockNotifications = mockNotifications.map((n) =>
    n.user_id === uid ? { ...n, is_read: true } : n,
  );
  return mockResponse({ success: true });
}

export function addMockNotification(notification) {
  const newId = mockNotifications.length + 1;
  const newNotif = {
    notification_id: newId,
    is_read: false,
    created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    ...notification,
  };
  mockNotifications = [newNotif, ...mockNotifications];
  return newNotif;
}
