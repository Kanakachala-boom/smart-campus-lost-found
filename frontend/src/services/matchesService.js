import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import {
  listMockUserMatches,
  listAllMockMatches,
  getMockItemMatches,
  updateMockMatchStatus,
} from "./mock/mockMatches";

export async function getMyMatches(userId) {
  if (USE_MOCK) {
    return listMockUserMatches(userId || 1);
  }

  return api.get(ENDPOINTS.MY_MATCHES);
}

export async function getItemMatches(type, itemId) {
  if (USE_MOCK) {
    return getMockItemMatches(type, itemId);
  }

  const endpoint = type === "lost" ? ENDPOINTS.LOST_MATCHES(itemId) : ENDPOINTS.FOUND_MATCHES(itemId);
  return api.get(endpoint);
}

export async function updateMatchStatus(matchId, status) {
  if (USE_MOCK) {
    return updateMockMatchStatus(matchId, status);
  }

  return api.patch(ENDPOINTS.UPDATE_MATCH_STATUS(matchId), { status });
}

export async function getAllMatches() {
  if (USE_MOCK) {
    return listAllMockMatches();
  }

  return api.get(ENDPOINTS.ADMIN_MATCHES);
}

export async function reconcileMatches() {
  if (USE_MOCK) {
    return { status: "success", reconciled: 0 };
  }

  return api.post(ENDPOINTS.RECONCILE_MATCHES);
}

export default {
  getMyMatches,
  getItemMatches,
  updateMatchStatus,
  getAllMatches,
  reconcileMatches,
};
