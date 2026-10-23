
import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  mockLostItems,
  mockFoundItems,
  updateMockItemStatus,
} from "./mock/mockItems";
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
    const activeLost = mockLostItems.filter(
      (item) => item.status === "ACTIVE"
    ).length;
    const activeFound = mockFoundItems.filter(
      (item) => item.status === "AVAILABLE"
    ).length;
    const returnedItems =
      mockLostItems.filter(
        (item) => ["RETURNED", "RECLAIMED"].includes(item.status)
      ).length +
      mockFoundItems.filter((item) => item.status === "RETURNED").length;

    const claimedItems = mockFoundItems.filter(
      (item) => item.status === "CLAIMED"
    ).length;

    const pendingClaims = claims.filter(
      (claim) => claim.status === "PENDING"
    ).length;
    const verifiedClaims = claims.filter(
      (claim) => ["VERIFIED", "APPROVED"].includes(claim.status)
    ).length;
    const rejectedClaims = claims.filter(
      (claim) => claim.status === "REJECTED"
    ).length;

    const totalReports = totalLost + totalFound;

    return {
      metrics: {
        totalLost,
        totalFound,
        totalReports,
        activeReports: activeLost + activeFound,
        claimedItems,
        returnedItems,
        pendingClaims,
        verifiedClaims,
        rejectedClaims,
        recoveryRate: totalReports
          ? Math.round((returnedItems / totalReports) * 100)
          : 0,
      },
    };
  }

  const data = await api.get(ENDPOINTS.ADMIN_DASHBOARD);
  return data;
}

export async function getAdminClaims() {
  if (USE_MOCK) {
    const response = await listAllMockClaims();
    return response.data;
  }

  return api.get(ENDPOINTS.ADMIN_CLAIMS);
}

export async function getAdminItems() {
  if (USE_MOCK) {
    const lost = mockLostItems.map((item) => ({
      ...item,
      id: item.lost_item_id,
      type: "lost",
    }));

    const found = mockFoundItems.map((item) => ({
      ...item,
      id: item.found_item_id,
      type: "found",
    }));

    return [...lost, ...found];
  }

  return api.get(ENDPOINTS.ADMIN_ITEMS);
}

export async function getAdminMatches() {
  if (USE_MOCK) {
    const response = await listAllMockMatches();
    return response.data;
  }

  return api.get(ENDPOINTS.ADMIN_MATCHES);
}

export async function adminVerifyClaim(claimId, instructions) {
  if (USE_MOCK) {
    const response = await adminVerifyMockClaim(claimId, instructions);
    return response.data;
  }

  return api.patch(ENDPOINTS.CLAIM_REVIEW(claimId), {
    status: "APPROVED",
  });
}

export async function adminRejectClaim(claimId, reason) {
  if (USE_MOCK) {
    const response = await adminRejectMockClaim(claimId, reason);
    return response.data;
  }

  return api.patch(ENDPOINTS.CLAIM_REVIEW(claimId), {
    status: "REJECTED",
  });
}

export async function adminUpdateItemStatus(type, id, status) {
  if (USE_MOCK) {
    const response = await updateMockItemStatus(type, id, status);
    return response.data;
  }

  throw new Error(
    "The admin item-status update endpoint has not been implemented in FastAPI."
  );
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
