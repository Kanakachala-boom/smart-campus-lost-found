
import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockUserNotifications,
  getMockUnreadCount,
  markMockNotificationRead,
  markAllMockNotificationsRead,
} from "./mock/mockNotifications";

export async function getNotifications(userId) {
  if (USE_MOCK) {
    return listMockUserNotifications(userId || 1);
  }

  return api.get(ENDPOINTS.NOTIFICATIONS);
}

export async function getUnreadCount(userId) {
  if (USE_MOCK) {
    return getMockUnreadCount(userId || 1);
  }

  return api.get(ENDPOINTS.NOTIFICATION_UNREAD_COUNT);
}

export async function markAsRead(notificationId) {
  if (USE_MOCK) {
    return markMockNotificationRead(notificationId);
  }

  return api.patch(ENDPOINTS.NOTIFICATION_READ(notificationId));
}

export async function markAllAsRead(userId) {
  if (USE_MOCK) {
    return markAllMockNotificationsRead(userId || 1);
  }

  return api.patch(ENDPOINTS.NOTIFICATIONS_READ_ALL);
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
