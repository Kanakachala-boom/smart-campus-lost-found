/**
 * Service for managing user-reported lost and found items (My Reports).
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - GET /api/users/me/reports
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { listMockUserReports } from "./mock/mockItems";

export async function getMyReports(userId) {
  if (USE_MOCK) {
    return listMockUserReports(userId || 1);
  }

  const res = await api.get(ENDPOINTS.MY_REPORTS);
  if (res && (Array.isArray(res.lost) || Array.isArray(res.found))) {
    const lost = (res.lost || []).map((i) => ({ ...i, type: "lost", item_type: "lost" }));
    const found = (res.found || []).map((i) => ({ ...i, type: "found", item_type: "found" }));
    return [...lost, ...found];
  }
  return res;
}

export default {
  getMyReports,
};
