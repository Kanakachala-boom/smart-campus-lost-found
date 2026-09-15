/**
 * Service for User Dashboard metrics and recent activity.
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - GET /api/dashboard
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { mockLostItems, mockFoundItems } from "./mock/mockItems";
import { mockClaims } from "./mock/mockClaims";
import { mockMatches } from "./mock/mockMatches";
import { mockNotifications } from "./mock/mockNotifications";

export async function getDashboardData(userId) {
  if (USE_MOCK) {
    const uid = Number(userId || 1);

    const activeLost = mockLostItems.filter(
      (item) => item.user_id === uid && item.status === "ACTIVE",
    ).length;

    const activeFound = mockFoundItems.filter(
      (item) => item.user_id === uid && item.status === "AVAILABLE",
    ).length;

    const pendingClaims = mockClaims.filter(
      (c) => c.claimant_user_id === uid && c.status === "PENDING",
    ).length;

    const userMatches = mockMatches.filter((m) => {
      const lost = mockLostItems.find((li) => li.lost_item_id === m.lost_item_id);
      const found = mockFoundItems.find((fi) => fi.found_item_id === m.found_item_id);
      return (lost?.user_id === uid || found?.user_id === uid) && m.status === "PENDING";
    }).length;

    const unreadNotifications = mockNotifications.filter(
      (n) => n.user_id === uid && !n.is_read,
    ).length;

    // Recent items reported by user
    const recentLost = mockLostItems
      .filter((i) => i.user_id === uid)
      .slice(0, 3)
      .map((i) => ({ ...i, id: i.lost_item_id || i.id, type: "lost" }));

    const recentFound = mockFoundItems
      .filter((i) => i.user_id === uid)
      .slice(0, 3)
      .map((i) => ({ ...i, id: i.found_item_id || i.id, type: "found" }));

    const recentClaims = mockClaims
      .filter((c) => c.claimant_user_id === uid)
      .slice(0, 3);

    return {
      metrics: {
        activeLost,
        activeFound,
        pendingClaims,
        potentialMatches: userMatches,
        unreadNotifications,
      },
      recentReports: [...recentLost, ...recentFound].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      ),
      recentClaims,
    };
  }

  return api.get(ENDPOINTS.DASHBOARD);
}

export default {
  getDashboardData,
};
