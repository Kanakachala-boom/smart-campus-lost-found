/**
 * Service for Campus Administration & Oversight.
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - GET  /api/admin/dashboard
 * - GET  /api/admin/claims
 * - GET  /api/admin/items
 * - GET  /api/admin/matches
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { mockLostItems, mockFoundItems, updateMockItemStatus } from "./mock/mockItems";
import {
  listAllMockClaims,
  adminVerifyMockClaim,
  adminRejectMockClaim,
} from "./mock/mockClaims";
import { listAllMockMatches } from "./mock/mockMatches";

export async function getAdminOverview() {
  if (USE_MOCK) {
    const claimsResponse = await listAllMockClaims();
    const claims = claimsResponse.data || [];

    const totalLost = mockLostItems.length;
    const totalFound = mockFoundItems.length;
    const activeLost = mockLostItems.filter((i) => i.status === "ACTIVE").length;
    const activeFound = mockFoundItems.filter((i) => i.status === "AVAILABLE").length;
    const returnedItems =
      mockLostItems.filter((i) => i.status === "RETURNED" || i.status === "RECLAIMED").length +
      mockFoundItems.filter((i) => i.status === "RETURNED").length;
    const claimedItems = mockFoundItems.filter((i) => i.status === "CLAIMED").length;

    const pendingClaims = claims.filter((c) => c.status === "PENDING").length;
    const verifiedClaims = claims.filter((c) => c.status === "VERIFIED").length;
    const rejectedClaims = claims.filter((c) => c.status === "REJECTED").length;

    const recoveryRate =
      totalLost + totalFound > 0
        ? Math.round((returnedItems / (totalLost + totalFound)) * 100)
        : 0;

    return {
      metrics: {
        totalLost,
        totalFound,
        totalReports: totalLost + totalFound,
        activeReports: activeLost + activeFound,
        claimedItems,
        returnedItems,
        pendingClaims,
        verifiedClaims,
        rejectedClaims,
        recoveryRate,
      },
    };
  }

  return api.get(ENDPOINTS.ADMIN_DASHBOARD);
}

export async function getAdminClaims() {
  if (USE_MOCK) {
    const res = await listAllMockClaims();
    return res.data;
  }
  return api.get(ENDPOINTS.ADMIN_CLAIMS);
}

export async function getAdminItems() {
  if (USE_MOCK) {
    const lost = mockLostItems.map((item) => ({
      id: item.lost_item_id,
      type: "lost",
      item_name: item.item_name,
      category: item.category,
      location: item.location_lost,
      date: item.date_lost,
      status: item.status,
      created_at: item.created_at,
      user_id: item.user_id,
      // Private identifying marks are accessible in authorized admin review
      identifying_marks: item.identifying_marks,
    }));

    const found = mockFoundItems.map((item) => ({
      id: item.found_item_id,
      type: "found",
      item_name: item.item_name,
      category: item.category,
      location: item.location_found,
      custody_location: item.custody_location,
      date: item.date_found,
      status: item.status,
      created_at: item.created_at,
      user_id: item.user_id,
    }));

    return [...lost, ...found];
  }

  return api.get(ENDPOINTS.ADMIN_ITEMS);
}

export async function getAdminMatches() {
  if (USE_MOCK) {
    const res = await listAllMockMatches();
    return res.data;
  }
  return api.get(ENDPOINTS.ADMIN_MATCHES);
}

export async function adminVerifyClaim(claimId, instructions) {
  if (USE_MOCK) {
    const res = await adminVerifyMockClaim(claimId, instructions);
    return res.data;
  }
  return api.post(ENDPOINTS.VERIFY_CLAIM(claimId), {
    status: "VERIFIED",
    handover_instructions: instructions,
  });
}

export async function adminRejectClaim(claimId, reason) {
  if (USE_MOCK) {
    const res = await adminRejectMockClaim(claimId, reason);
    return res.data;
  }
  return api.post(ENDPOINTS.VERIFY_CLAIM(claimId), {
    status: "REJECTED",
    rejection_reason: reason,
  });
}

export async function adminUpdateItemStatus(type, id, status) {
  if (USE_MOCK) {
    const res = await updateMockItemStatus(type, id, status);
    return res.data;
  }
  return api.patch(ENDPOINTS.ITEM_DETAIL(type, id), { status });
}

export default {
  getAdminOverview,
  getAdminClaims,
  getAdminItems,
  getAdminMatches,
  adminVerifyClaim,
  adminRejectClaim,
  adminUpdateItemStatus,
};
