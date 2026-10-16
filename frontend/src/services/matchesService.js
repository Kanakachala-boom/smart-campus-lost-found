
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

  throw new Error(
    "GET /matches/my-matches is not implemented in the FastAPI backend yet."
  );
}

export async function getItemMatches(type, itemId) {
  if (USE_MOCK) {
    return getMockItemMatches(type, itemId);
  }

  throw new Error(
    "Item matching endpoints are not implemented in the FastAPI backend yet."
  );
}

export async function updateMatchStatus(matchId, status) {
  if (USE_MOCK) {
    return updateMockMatchStatus(matchId, status);
  }

  throw new Error(
    "PATCH /matches/{id}/status is not implemented in the FastAPI backend yet."
  );
}

export async function getAllMatches() {
  if (USE_MOCK) {
    return listAllMockMatches();
  }

  throw new Error(
    "GET /admin/matches is not implemented in the FastAPI backend yet."
  );
}

export default {
  getMyMatches,
  getItemMatches,
  updateMatchStatus,
  getAllMatches,
};
