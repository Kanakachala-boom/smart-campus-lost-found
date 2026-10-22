/**
 * Mock Targeted Notifications Store for NIE Mysuru.
 *
 * Implements two-way notifications:
 * - Match alert to lost reporter when matching found item arrives
 * - Match alert to found reporter when matching lost item arrives
 * - Claim submission & status transition alerts
 */

import { mockResponse, mockError } from "./mockClient";

export let mockNotifications = [];

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
